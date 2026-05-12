import type { EpisodeStatus, ProjectEpisodeStatus } from "@ls-pull-video/shared";

type AnyEpisodeStatus = EpisodeStatus | ProjectEpisodeStatus;

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
	pending: { label: "队列中", color: "var(--color-status-pending)", bg: "rgba(74, 74, 90, 0.15)" },
	unparsed: { label: "未解析", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)" },
	downloading: {
		label: "下载中",
		color: "var(--color-status-downloading)",
		bg: "rgba(59, 130, 246, 0.1)",
	},
	downloaded: {
		label: "已下载",
		color: "var(--color-status-downloaded)",
		bg: "rgba(6, 182, 212, 0.1)",
	},
	uploading: {
		label: "上传中",
		color: "var(--color-status-uploading)",
		bg: "rgba(245, 158, 11, 0.1)",
	},
	uploaded: {
		label: "已上传",
		color: "var(--color-status-uploaded)",
		bg: "rgba(34, 197, 94, 0.1)",
	},
	saved: {
		label: "已保存",
		color: "var(--color-green-500)",
		bg: "rgba(34, 197, 94, 0.1)",
	},
	failed: { label: "失败", color: "var(--color-status-failed)", bg: "rgba(239, 68, 68, 0.1)" },
};

export function StatusBadge({ status }: { status: AnyEpisodeStatus }) {
	const fallback = {
		label: status,
		color: "var(--color-text-muted)",
		bg: "rgba(74, 74, 90, 0.15)",
	};
	const config = statusConfig[status] ?? fallback;

	return (
		<span
			className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] tracking-[0.08em] uppercase font-bold"
			style={{
				color: config.color,
				background: config.bg,
				border: `1px solid ${config.color}22`,
				fontFamily: "var(--font-mono)",
			}}
		>
			<span
				className="w-1.5 h-1.5 rounded-full"
				style={{
					background: config.color,
					boxShadow:
						status === "downloading" || status === "uploading" ? `0 0 6px ${config.color}` : "none",
				}}
			/>
			{config.label}
		</span>
	);
}
