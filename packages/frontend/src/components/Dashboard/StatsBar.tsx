import type { EpisodeStatus } from "@ls-pull-video/shared";

interface StatsBarProps {
	counts: Record<EpisodeStatus, number>;
	transferredSizeBytes: number;
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

const statCards: { key: EpisodeStatus | "total" | "transferred"; label: string; color: string }[] =
	[
		{ key: "total", label: "总计", color: "var(--color-text-primary)" },
		{ key: "pending", label: "队列中", color: "var(--color-status-pending)" },
		{ key: "downloading", label: "活跃", color: "var(--color-status-downloading)" },
		{ key: "uploaded", label: "已完成", color: "var(--color-status-uploaded)" },
		{ key: "failed", label: "失败", color: "var(--color-status-failed)" },
		{ key: "transferred", label: "已传输", color: "var(--color-amber-400)" },
	];

export function StatsBar({ counts, transferredSizeBytes }: StatsBarProps) {
	const total =
		(counts.pending || 0) +
		(counts.unparsed || 0) +
		(counts.downloading || 0) +
		(counts.downloaded || 0) +
		(counts.uploading || 0) +
		(counts.uploaded || 0) +
		(counts.failed || 0);
	const active = counts.downloading + counts.uploading;

	const values: Record<string, number | string> = {
		total,
		pending: counts.pending,
		downloading: active,
		uploaded: counts.uploaded,
		failed: counts.failed,
		transferred: formatBytes(transferredSizeBytes),
	};

	return (
		<div className="grid grid-cols-6 gap-3">
			{statCards.map((card, i) => (
				<div
					key={card.key}
					className="rounded-xl px-4 py-4 border animate-fade-in"
					style={{
						background: "var(--color-bg-elevated)",
						borderColor:
							card.key === "failed" && counts.failed > 0
								? "rgba(239, 68, 68, 0.2)"
								: "var(--color-border-subtle)",
						animationDelay: `${i * 60}ms`,
						animationFillMode: "backwards",
					}}
				>
					<div
						className="text-[9px] tracking-[0.2em] uppercase mb-2"
						style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
					>
						{card.label}
					</div>
					<div
						className="text-xl font-bold tabular-nums"
						style={{ color: card.color, fontFamily: "var(--font-mono)" }}
					>
						{values[card.key]}
					</div>
				</div>
			))}
		</div>
	);
}
