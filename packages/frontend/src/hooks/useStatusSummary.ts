import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client.js";

import type { StatusSummary } from "@ls-pull-video/shared";

export function useStatusSummary() {
	return useQuery({
		queryKey: ["status"],
		queryFn: () => apiFetch<StatusSummary>("/api/status/summary"),
		refetchInterval: 5000,
	});
}
