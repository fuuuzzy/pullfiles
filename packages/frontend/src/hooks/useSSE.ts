import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createSSEConnection } from "../api/sse.js";
import type { ProgressEvent } from "@ls-pull-video/shared";

interface ProgressMap {
	[episodeId: number]: ProgressEvent;
}

export function useSSE() {
	const qc = useQueryClient();
	const progressRef = useRef<ProgressMap>({});
	const listenersRef = useRef<Set<(map: ProgressMap) => void>>(new Set());

	const subscribe = useCallback((listener: (map: ProgressMap) => void) => {
		listenersRef.current.add(listener);
		return () => {
			listenersRef.current.delete(listener);
		};
	}, []);

	const getProgress = useCallback(() => progressRef.current, []);

	useEffect(() => {
		const es = createSSEConnection({
			onProgress: (event) => {
				progressRef.current = { ...progressRef.current, [event.episodeId]: event };
				listenersRef.current.forEach((fn) => fn(progressRef.current));
			},
			onStatus: () => {
				qc.invalidateQueries({ queryKey: ["episodes"] });
				qc.invalidateQueries({ queryKey: ["status"] });
			},
			onTaskUpdate: () => {
				qc.invalidateQueries({ queryKey: ["tasks"] });
				qc.invalidateQueries({ queryKey: ["status"] });
			},
		});

		return () => es.close();
	}, [qc]);

	return { subscribe, getProgress };
}
