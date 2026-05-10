import type { Episode, EpisodeStatus, ProgressEvent } from "@ls-pull-video/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { apiFetch } from "../api/client.js";
import { TransferLog } from "../components/Transfer/TransferLog.js";
import { TransferPanel } from "../components/Transfer/TransferPanel.js";
import { useSSE } from "../hooks/useSSE.js";

interface EpisodesResponse {
	episodes: Episode[];
	counts: Record<EpisodeStatus, number>;
}

export function TransferPage() {
	const { subscribe, isPipelineRunning, setIsPipelineRunning } = useSSE();
	const [progressMap, setProgressMap] = useState<Record<number, ProgressEvent>>({});

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

	// Fetch pending count for TransferPanel
	const { data: statusData } = useQuery({
		queryKey: ["status"],
		queryFn: () => apiFetch<Record<string, number>>("/api/status/summary"),
		refetchInterval: 5000,
	});

	// Fetch active episodes (downloading/uploading/downloaded) - separate query to ensure we get these
	const { data: activeData, isLoading: activeLoading } = useQuery({
		queryKey: ["episodes", "active"],
		queryFn: () =>
			apiFetch<EpisodesResponse>(
				"/api/episodes?status=downloading&status=downloaded&status=uploading&limit=100",
			),
	});

	// Fetch recent episodes (uploaded/failed)
	const { data: recentData, isLoading: recentLoading } = useQuery({
		queryKey: ["episodes", "recent"],
		queryFn: () =>
			apiFetch<EpisodesResponse>("/api/episodes?status=uploaded&status=failed&limit=20"),
	});

	useEffect(() => {
		return subscribe(setProgressMap);
	}, [subscribe]);

	const activeEpisodes = activeData?.episodes ?? [];
	const recentEpisodes = recentData?.episodes ?? [];
	const counts = statusData ?? { pending: 0 };
	const pendingCount = counts.pending ?? 0;

	return (
		<div className="p-6 space-y-6">
			<div>
				<h1
					className="text-xl font-bold tracking-wide"
					style={{ color: "var(--color-text-primary)" }}
				>
					传输任务
				</h1>
				<p
					className="text-xs mt-1"
					style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
				>
					监控传输进度和查看历史记录
				</p>
			</div>

			<TransferPanel pendingCount={pendingCount} isPipelineRunning={isPipelineRunning} />
			<TransferLog
				activeEpisodes={activeEpisodes}
				recentEpisodes={recentEpisodes}
				progressMap={progressMap}
				isLoading={activeLoading || recentLoading}
			/>
		</div>
	);
}
