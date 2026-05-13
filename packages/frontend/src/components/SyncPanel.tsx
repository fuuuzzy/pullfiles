import { useEffect, useRef, useState } from "react";
import { useSync } from "../hooks/useEpisodes.js";

const HISTORY_KEY = "sync-path-history";
const MAX_HISTORY = 20;

function loadHistory(): string[] {
	try {
		const raw = localStorage.getItem(HISTORY_KEY);
		return raw ? (JSON.parse(raw) as string[]) : [];
	} catch {
		return [];
	}
}

function saveToHistory(paths: string[], newPath: string): string[] {
	const updated = [newPath, ...paths.filter((p) => p !== newPath)].slice(0, MAX_HISTORY);
	localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
	return updated;
}

export function SyncPanel() {
	const [path, setPath] = useState("");
	const [history, setHistory] = useState<string[]>(loadHistory);
	const [showHistory, setShowHistory] = useState(false);
	const sync = useSync();
	const wrapperRef = useRef<HTMLFormElement>(null);

	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
				setShowHistory(false);
			}
		};
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!path.trim()) return;
		setHistory(saveToHistory(history, path.trim()));
		setShowHistory(false);
		sync.mutate(path.trim());
	};

	const selectHistory = (item: string) => {
		setPath(item);
		setShowHistory(false);
	};

	return (
		<div
			className="rounded-xl p-5 border"
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
					文件同步
				</span>
			</div>

			<form onSubmit={handleSubmit} className="flex gap-3" ref={wrapperRef}>
				<div className="flex-1 relative">
					<input
						type="text"
						value={path}
						onChange={(e) => setPath(e.target.value)}
						placeholder="/百度网盘/文件夹路径"
						className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all duration-200"
						style={{
							background: "var(--color-bg-primary)",
							border: "1px solid var(--color-border-default)",
							color: "var(--color-text-primary)",
							fontFamily: "var(--font-mono)",
						}}
						onFocus={(e) => {
							e.currentTarget.style.borderColor = "var(--color-amber-500)";
							e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-amber-glow)";
							if (history.length > 0) setShowHistory(true);
						}}
						onBlur={(e) => {
							e.currentTarget.style.borderColor = "var(--color-border-default)";
							e.currentTarget.style.boxShadow = "none";
						}}
					/>
					{showHistory && history.length > 0 && (
						<div
							className="absolute left-0 right-0 top-full mt-1 rounded-lg overflow-hidden z-50 max-h-60 overflow-y-auto"
							style={{
								background: "var(--color-bg-elevated)",
								border: "1px solid var(--color-border-default)",
								boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
							}}
						>
							{history.map((item) => (
								<button
									type="button"
									key={item}
									onMouseDown={(e) => {
										e.preventDefault();
										selectHistory(item);
									}}
									className="w-full text-left px-4 py-2 text-sm transition-colors duration-100 cursor-pointer"
									style={{
										color: "var(--color-text-primary)",
										fontFamily: "var(--font-mono)",
										background: "transparent",
										border: "none",
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.background = "var(--color-bg-surface)";
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.background = "transparent";
									}}
								>
									{item}
								</button>
							))}
						</div>
					)}
				</div>

				<button
					type="submit"
					disabled={sync.isPending || !path.trim()}
					className="px-5 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
					style={{
						background: sync.isPending ? "var(--color-bg-surface)" : "var(--color-amber-500)",
						color: sync.isPending ? "var(--color-text-muted)" : "#000",
						border: "none",
						fontFamily: "var(--font-mono)",
					}}
				>
					{sync.isPending ? "扫描中..." : "同步"}
				</button>
			</form>

			{sync.isSuccess && sync.data && (
				<div
					className="mt-3 text-xs py-2 px-3 rounded"
					style={{
						background: "rgba(34, 197, 94, 0.06)",
						color: "var(--color-status-uploaded)",
						fontFamily: "var(--font-mono)",
					}}
				>
					发现 {sync.data.totalFiles} 个文件 — {sync.data.newFiles} 个新增，{sync.data.skippedFiles}{" "}
					个已跳过
				</div>
			)}

			{sync.isError && (
				<div
					className="mt-3 text-xs py-2 px-3 rounded"
					style={{
						background: "rgba(239, 68, 68, 0.06)",
						color: "var(--color-status-failed)",
						fontFamily: "var(--font-mono)",
					}}
				>
					同步失败：{sync.error.message}
				</div>
			)}
		</div>
	);
}
