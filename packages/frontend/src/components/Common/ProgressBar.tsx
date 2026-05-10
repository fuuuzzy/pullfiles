import type { ProgressEvent } from "@ls-pull-video/shared";

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
}

function formatSpeed(bytesPerSec: number): string {
	if (bytesPerSec === 0) return "—";
	return `${formatBytes(bytesPerSec)}/s`;
}

function formatETA(bytesRemaining: number, speed: number): string {
	if (speed === 0) return "—";
	const seconds = Math.max(0, bytesRemaining / speed);
	if (!Number.isFinite(seconds)) return "—";

	if (seconds < 60) return `${Math.ceil(seconds)}s`;
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = Math.ceil(seconds % 60);
	return `${minutes}m ${remainingSeconds}s`;
}

export function ProgressBar({ progress }: { progress: ProgressEvent | undefined }) {
	if (!progress) return null;

	const phase = progress.phase;
	// 使用图片中经典的蓝色作为下载颜色，上传使用橙色区分
	const fillColor = phase === "download" ? "#5b8def" : "#f59e0b";
	const label = phase === "download" ? "下载中..." : "上传中...";

	const bytesRemaining = Math.max(0, progress.totalBytes - progress.bytesTransferred);
	const eta = formatETA(bytesRemaining, progress.speed);

	return (
		<div className="w-full mt-3 flex flex-col items-center">
			<div className="flex items-center w-full gap-4">
				{/* 外部边框容器（带内边距） */}
				<div
					className="flex-1 h-[18px] rounded-full border p-[2px] bg-transparent"
					style={{ borderColor: "var(--color-border-default)" }}
				>
					{/* 内部填充（带平滑的宽度增长动画） */}
					<div
						className="h-full rounded-full transition-[width] duration-500 ease-out"
						style={{
							width: `${progress.percent}%`,
							backgroundColor: fillColor,
						}}
					/>
				</div>
				{/* 右侧百分比 */}
				<div
					className="text-sm font-mono tracking-wider w-12 text-right"
					style={{ color: "var(--color-text-primary)" }}
				>
					{progress.percent}
					<span className="text-[10px] ml-0.5">%</span>
				</div>
			</div>

			{/* 底部信息栏 */}
			<div className="flex justify-between items-center w-full mt-2 px-2">
				<span
					className="text-[11px] tracking-wider"
					style={{ color: "var(--color-text-secondary)" }}
				>
					{label}
				</span>
				<span className="text-[10px] font-mono" style={{ color: "var(--color-text-muted)" }}>
					{formatBytes(progress.bytesTransferred)} / {formatBytes(progress.totalBytes)} •{" "}
					{formatSpeed(progress.speed)} • ETA: {eta}
				</span>
			</div>
		</div>
	);
}
