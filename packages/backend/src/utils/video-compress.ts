import { stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import type { CompressSettings } from "@ls-pull-video/shared";

const MIN_BITRATE_KBPS = 200;
const MAX_BITRATE_KBPS = 8000;
const BYTES_PER_MB = 1024 * 1024;

export interface CompressResult {
	inputSize: number;
	outputSize: number;
	skipped: boolean;
	durationMs: number;
}

export async function shouldCompress(
	filePath: string,
	skipThresholdMB: number,
): Promise<{ should: boolean; fileSize: number }> {
	const fileStat = await stat(filePath);
	const fileSizeMB = fileStat.size / BYTES_PER_MB;
	return { should: fileSizeMB >= skipThresholdMB, fileSize: fileStat.size };
}

export async function getVideoDuration(
	ffprobePath: string,
	filePath: string,
): Promise<number> {
	return new Promise((resolve, reject) => {
		const proc = spawn(ffprobePath, [
			"-v", "error",
			"-show_entries", "format=duration",
			"-of", "default=noprint_wrappers=1:nokey=1",
			filePath,
		]);

		let stdout = "";
		let stderr = "";
		proc.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
		proc.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });

		proc.on("close", (code) => {
			if (code !== 0) {
				reject(new Error(`ffprobe failed (code ${code}): ${stderr}`));
				return;
			}
			const duration = Number.parseFloat(stdout.trim());
			if (Number.isNaN(duration) || duration <= 0) {
				reject(new Error(`Invalid duration: ${stdout.trim()}`));
				return;
			}
			resolve(duration);
		});

		proc.on("error", reject);
	});
}

function parseResolution(resolution: string): { w: number; h: number } {
	const parts = resolution.split("x");
	return {
		w: Number.parseInt(parts[0] ?? "1080", 10),
		h: Number.parseInt(parts[1] ?? "1920", 10),
	};
}

export function buildFfmpegArgs(
	inputPath: string,
	outputPath: string,
	settings: CompressSettings,
	duration: number,
): string[] {
	const { w, h } = parseResolution(settings.resolution);

	const vf = [
		`scale=${w}:${h}:force_original_aspect_ratio=decrease`,
		`pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black`,
		`fps=${settings.fps}`,
		"setsar=1",
	].join(",");

	const targetBitrate = Math.floor(
		(settings.target_size_mb * 8192 * 0.95) / duration,
	);

	const useBitrateMode =
		targetBitrate >= MIN_BITRATE_KBPS && targetBitrate <= MAX_BITRATE_KBPS;

	const args = ["-y", "-i", inputPath, "-vf", vf];

	if (settings.threads > 0) {
		args.push("-threads", String(settings.threads));
	}

	args.push("-c:v", "libx264", "-preset", settings.preset, "-profile:v", "main", "-level", "4.0");

	if (useBitrateMode) {
		const maxrate = Math.floor(targetBitrate * 1.5);
		const bufsize = targetBitrate * 2;
		args.push(
			"-b:v", `${targetBitrate}k`,
			"-maxrate", `${maxrate}k`,
			"-bufsize", `${bufsize}k`,
		);
	} else {
		args.push("-crf", String(settings.crf));
	}

	args.push(
		"-c:a", "aac",
		"-b:a", settings.audio_bitrate,
		"-movflags", "+faststart",
		"-f", "mp4",
		outputPath,
	);

	return args;
}

export async function compressVideo(
	ffmpegPath: string,
	inputPath: string,
	outputPath: string,
	settings: CompressSettings,
	duration: number,
	signal?: AbortSignal,
	onProgress?: (percent: number) => void,
): Promise<CompressResult> {
	const startTime = Date.now();
	const inputStat = await stat(inputPath);
	const args = buildFfmpegArgs(inputPath, outputPath, settings, duration);

	return new Promise((resolve, reject) => {
		const proc = spawn(ffmpegPath, args);

		let stderr = "";

		if (signal) {
			const onAbort = () => { proc.kill("SIGKILL"); };
			signal.addEventListener("abort", onAbort, { once: true });
			proc.on("close", () => {
				signal.removeEventListener("abort", onAbort);
			});
		}

		proc.stderr.on("data", (chunk: Buffer) => {
			const text = chunk.toString();
			stderr += text;

			// Parse ffmpeg progress: time=HH:MM:SS.xx
			const timeMatch = text.match(/time=(\d+):(\d+):(\d+)\.(\d+)/);
			if (timeMatch && onProgress) {
				const hours = Number.parseInt(timeMatch[1] ?? "0", 10);
				const minutes = Number.parseInt(timeMatch[2] ?? "0", 10);
				const seconds = Number.parseInt(timeMatch[3] ?? "0", 10);
				const centiseconds = Number.parseInt(timeMatch[4] ?? "0", 10);
				const currentTime = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
				const percent = Math.min(100, Math.round((currentTime / duration) * 100));
				onProgress(percent);
			}
		});

		proc.on("close", async (code) => {
			if (signal?.aborted) {
				reject(new Error("Compression cancelled"));
				return;
			}

			if (code !== 0) {
				reject(new Error(`ffmpeg failed (code ${code}): ${stderr.slice(-500)}`));
				return;
			}

			try {
				const outputStat = await stat(outputPath);
				resolve({
					inputSize: inputStat.size,
					outputSize: outputStat.size,
					skipped: false,
					durationMs: Date.now() - startTime,
				});
			} catch (err) {
				reject(new Error(`Compressed file not found: ${outputPath}`));
			}
		});

		proc.on("error", reject);
	});
}
