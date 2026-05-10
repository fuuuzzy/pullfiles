import type { ProgressEvent } from "@ls-pull-video/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { createSSEConnection } from "../api/sse.js";

interface ProgressMap {
	[episodeId: number]: ProgressEvent;
}

export function useSSE() {
	const qc = useQueryClient();
	const progressRef = useRef<ProgressMap>({});
	const listenersRef = useRef<Set<(map: ProgressMap) => void>>(new Set());
	const [isPipelineRunning, setIsPipelineRunning] = useState<boolean>(false);

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
				for (const fn of listenersRef.current) {
					fn(progressRef.current);
				}
			},
			onStatus: () => {
				qc.invalidateQueries({ queryKey: ["episodes"] });
				qc.invalidateQueries({ queryKey: ["status"] });
			},
			onTaskUpdate: () => {
				qc.invalidateQueries({ queryKey: ["tasks"] });
				qc.invalidateQueries({ queryKey: ["status"] });
			},
			onPipelineStatus: (event) => {
				setIsPipelineRunning(event.isRunning);
			},
		});

		return () => es.close();
	}, [qc]);

	return { subscribe, getProgress, isPipelineRunning, setIsPipelineRunning };
}
