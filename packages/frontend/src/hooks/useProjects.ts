import type { Project, ProjectEpisode, ProjectStatus } from "@ls-pull-video/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client.js";

interface ProjectStatusResponse {
	projectId: number;
	status: ProjectStatus;
	total: number;
	pending: number;
	downloading: number;
	uploading: number;
	uploaded: number;
	saved: number;
	failed: number;
}

export function useProjects() {
	return useQuery({
		queryKey: ["projects"],
		queryFn: (): Promise<Project[]> => apiFetch("/api/projects"),
	});
}

export function useProject(projectId: number) {
	return useQuery({
		queryKey: ["projects", projectId],
		queryFn: (): Promise<Project> => apiFetch(`/api/projects/${projectId}`),
		enabled: !!projectId,
	});
}

export function useProjectEpisodes(projectId: number) {
	return useQuery({
		queryKey: ["projects", projectId, "episodes"],
		queryFn: (): Promise<ProjectEpisode[]> => apiFetch(`/api/projects/${projectId}/episodes`),
		enabled: !!projectId,
	});
}

export function useProjectStatus(projectId: number) {
	return useQuery({
		queryKey: ["projects", projectId, "status"],
		queryFn: (): Promise<ProjectStatusResponse> => apiFetch(`/api/projects/${projectId}/status`),
		enabled: !!projectId,
		refetchInterval: 5000,
	});
}

export function useImportProject() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (file: File) => {
			const formData = new FormData();
			formData.append("file", file);

			const res = await fetch("/api/projects/import", {
				method: "POST",
				body: formData,
			});

			const data = await res.json();
			if (!data.success) {
				throw new Error(data.error ?? "Import failed");
			}
			return data.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["projects"] });
		},
	});
}

export function useStartSync() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (projectId: number) => {
			const res = await fetch(`/api/projects/${projectId}/start`, { method: "POST" });
			const data = await res.json();
			if (!data.success) {
				throw new Error(data.error ?? "Start sync failed");
			}
			return data.data;
		},
		onSuccess: (_data, projectId) => {
			queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
			queryClient.invalidateQueries({ queryKey: ["projects", projectId, "status"] });
		},
	});
}

export function useDeleteProject() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (projectId: number) => {
			const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
			const data = await res.json();
			if (!data.success) {
				throw new Error(data.error ?? "Delete failed");
			}
			return data.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["projects"] });
		},
	});
}

export function useSyncStatus() {
	return useQuery({
		queryKey: ["projects", "sync", "status"],
		queryFn: (): Promise<{ isRunning: boolean }> => apiFetch("/api/projects/sync/status"),
		refetchInterval: 5000,
	});
}
