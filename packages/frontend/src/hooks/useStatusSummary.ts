import type { StatusSummary } from "@ls-pull-video/shared";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client.js";

export function useStatusSummary() {
	return useQuery({
		queryKey: ["status"],
		queryFn: () => apiFetch<StatusSummary>("/api/status/summary"),
		refetchInterval: 5000,
	});
}
