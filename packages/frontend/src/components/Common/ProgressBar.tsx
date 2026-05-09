import type { ProgressEvent } from "@ls-pull-video/shared";

function formatSpeed(bytesPerSec: number): string {
	if (bytesPerSec === 0) return "—";
	if (bytesPerSec > 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
	return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
}

export function ProgressBar({ progress }: { progress: ProgressEvent | undefined }) {
	if (!progress) return null;

	const phase = progress.phase;
	const color =
		phase === "download" ? "var(--color-status-downloading)" : "var(--color-status-uploading)";
	const label = phase === "download" ? "下载" : "上传";

	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between">
				<span
					className="text-[9px] tracking-[0.15em] uppercase font-bold"
					style={{ color, fontFamily: "var(--font-mono)" }}
				>
					{label} {progress.percent}%
				</span>
				<span
					className="text-[9px]"
					style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
				>
					{formatSpeed(progress.speed)}
				</span>
			</div>
			<div
				className="h-1 rounded-full overflow-hidden"
				style={{ background: "var(--color-bg-primary)" }}
			>
				<div
					className="h-full rounded-full transition-all duration-300"
					style={{
						width: `${progress.percent}%`,
						background: `linear-gradient(90deg, ${color}, ${color}aa)`,
						boxShadow: `0 0 8px ${color}44`,
					}}
				/>
			</div>
		</div>
	);
}
