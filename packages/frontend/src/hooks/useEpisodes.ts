import type { Episode, EpisodeStatus, SyncResult } from "@ls-pull-video/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client.js";

interface EpisodesResponse {
	episodes: Episode[];
	counts: Record<EpisodeStatus, number>;
}

interface EpisodeFolder {
	folder: string;
	episodes: Episode[];
	count: number;
}

interface GroupedEpisodesResponse {
	folders: EpisodeFolder[];
	counts: Record<EpisodeStatus, number>;
}

export function useEpisodes(options: { status?: EpisodeStatus; page?: number } = {}) {
	const { status, page = 1 } = options;
	const params = new URLSearchParams({ page: String(page), limit: "50" });
	if (status) params.set("status", status);

	return useQuery({
		queryKey: ["episodes", status, page],
		queryFn: () => apiFetch<EpisodesResponse>(`/api/episodes?${params}`),
	});
}

export function useEpisodesGrouped(status?: EpisodeStatus) {
	const params = new URLSearchParams();
	if (status) params.set("status", status);

	return useQuery({
		queryKey: ["episodesGrouped", status],
		queryFn: () => apiFetch<GroupedEpisodesResponse>(`/api/episodes/grouped?${params}`),
	});
}

export function useSync() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (path: string) =>
			apiFetch<SyncResult>("/api/baidu/sync", {
				method: "POST",
				body: JSON.stringify({ path }),
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["episodes"] });
			qc.invalidateQueries({ queryKey: ["status"] });
		},
	});
}

export function useStartTransfer() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => apiFetch<{ message: string }>("/api/transfer/start", { method: "POST" }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["episodes"] });
			qc.invalidateQueries({ queryKey: ["pipelineStatus"] });
		},
	});
}

export function useCancelTransfer() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => apiFetch<{ message: string }>("/api/transfer/cancel", { method: "POST" }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["pipelineStatus"] });
		},
	});
}

export function useRetryEpisode() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: number) =>
			apiFetch<{ message: string }>(`/api/episodes/${id}/retry`, { method: "POST" }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["episodes"] });
			qc.invalidateQueries({ queryKey: ["status"] });
		},
	});
}

export function useRetryAllFailed() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => apiFetch<{ message: string }>("/api/episodes/retry/all", { method: "POST" }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["episodes"] });
			qc.invalidateQueries({ queryKey: ["status"] });
		},
	});
}
