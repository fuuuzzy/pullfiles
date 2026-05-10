import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client.js";
import { RecentActivity } from "../components/Dashboard/RecentActivity.js";
import { StatsBar } from "../components/Dashboard/StatsBar.js";
import { SyncPanel } from "../components/SyncPanel.js";
import { useEpisodes, useStartTransfer } from "../hooks/useEpisodes.js";
import { useSSE } from "../hooks/useSSE.js";
import { useStatusSummary } from "../hooks/useStatusSummary.js";

export function DashboardPage() {
	const { data: summary } = useStatusSummary();
	const { data: episodesData, isLoading: isEpisodesLoading } = useEpisodes();
	const startTransfer = useStartTransfer();
	const { subscribe: _subscribe, getProgress: _getProgress, isPipelineRunning, setIsPipelineRunning } = useSSE();

	// Fetch initial pipeline status
	useQuery({
		queryKey: ["pipelineStatus"],
		queryFn: async () => {
			const res = await apiFetch<{ isRunning: boolean }>("/api/transfer/status");
			if (res) {
				setIsPipelineRunning(res.isRunning);
			}
			return res;
		},
	});

	const counts = summary ?? {
		pending: 0,
		unparsed: 0,
		downloading: 0,
		downloaded: 0,
		uploading: 0,
		uploaded: 0,
		failed: 0,
		totalSizeBytes: 0,
		transferredSizeBytes: 0,
	};
	const episodes = episodesData?.episodes ?? [];

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1
						className="text-xl font-bold tracking-wide"
						style={{ color: "var(--color-text-primary)" }}
					>
						仪表盘
					</h1>
					<p
						className="text-xs mt-1"
						style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
					>
						媒体传输任务概览
					</p>
				</div>
				<div className="flex items-center gap-2">
					<div
						className="w-2 h-2 rounded-full animate-pulse-glow"
						style={{ background: "var(--color-amber-500)" }}
					/>
					<span
						className="text-[10px] tracking-[0.15em] uppercase"
						style={{ color: "var(--color-amber-400)", fontFamily: "var(--font-mono)" }}
					>
						系统运行中
					</span>
				</div>
			</div>

			{/* Stats */}
			<StatsBar
				counts={counts}
				transferredSizeBytes={counts.transferredSizeBytes}
			/>

			{/* Sync + Transfer controls */}
			<div className="grid grid-cols-2 gap-4">
				<SyncPanel />

				<div
					className="rounded-xl p-5 border flex flex-col justify-between"
					style={{
						background: "var(--color-bg-elevated)",
						borderColor: "var(--color-border-subtle)",
					}}
				>
					<div className="flex items-center gap-2 mb-4">
						<div
							className="w-1.5 h-1.5 rounded-full"
							style={{ background: "var(--color-amber-500)" }}
						/>
						<span
							className="text-[10px] tracking-[0.2em] uppercase font-bold"
							style={{ color: "var(--color-amber-400)", fontFamily: "var(--font-mono)" }}
						>
							快速传输
						</span>
					</div>
					<div className="flex items-center justify-between">
						<p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
							<span
								className="tabular-nums"
								style={{ fontFamily: "var(--font-mono)", color: "var(--color-amber-300)" }}
							>
								{counts.pending}
							</span>{" "}
							个文件待传输
						</p>
						<button
							type="button"
							onClick={() => startTransfer.mutate()}
							disabled={startTransfer.isPending || counts.pending === 0 || isPipelineRunning}
							className="px-5 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
							style={{
								background:
									counts.pending === 0 || isPipelineRunning
										? "var(--color-bg-surface)"
										: "var(--color-amber-500)",
								color:
									counts.pending === 0 || isPipelineRunning ? "var(--color-text-muted)" : "#000",
								border: "none",
								fontFamily: "var(--font-mono)",
							}}
						>
							{isPipelineRunning ? "传输中..." : startTransfer.isPending ? "启动中..." : "开始传输"}
						</button>
					</div>
				</div>
			</div>

			{/* Recent Activity */}
			<RecentActivity episodes={episodes} isLoading={isEpisodesLoading} />
		</div>
	);
}
