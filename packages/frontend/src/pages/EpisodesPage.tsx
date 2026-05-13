import type { EpisodeStatus } from "@ls-pull-video/shared";
import { useState } from "react";
import { EpisodeList } from "../components/Episodes/EpisodeList.js";
import { useEpisodes } from "../hooks/useEpisodes.js";

export function EpisodesPage() {
	const [filter, setFilter] = useState<EpisodeStatus | "all">("all");
	const [page, setPage] = useState(1);

	const { data, isLoading } = useEpisodes({
		...(filter !== "all" && { status: filter }),
		page,
	});

	const episodes = data?.episodes ?? [];
	const counts = data?.counts ?? {
		pending: 0,
		unparsed: 0,
		downloading: 0,
		downloaded: 0,
		compressing: 0,
		uploading: 0,
		uploaded: 0,
		failed: 0,
	};

	const totalItems =
		filter === "all" ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[filter];
	const totalPages = Math.max(1, Math.ceil(totalItems / 50));

	const handleJumpPage = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			const val = parseInt(e.currentTarget.value, 10);
			if (!Number.isNaN(val) && val >= 1 && val <= totalPages) {
				setPage(val);
			}
			e.currentTarget.value = "";
		}
	};

	return (
		<div className="p-6 space-y-6">
			<div>
				<h1
					className="text-xl font-bold tracking-wide"
					style={{ color: "var(--color-text-primary)" }}
				>
					剧集管理
				</h1>
				<p
					className="text-xs mt-1"
					style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
				>
					浏览和管理已同步的视频文件
				</p>
			</div>

			<EpisodeList
				episodes={episodes}
				filter={filter}
				onFilterChange={(f) => {
					setFilter(f);
					setPage(1);
				}}
				counts={counts}
				isLoading={isLoading}
			/>

			{/* Pagination */}
			<div
				className="flex items-center justify-between border-t pt-4"
				style={{ borderColor: "var(--color-border-subtle)" }}
			>
				<div
					className="text-xs"
					style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
				>
					共{" "}
					<span className="font-bold" style={{ color: "var(--color-text-primary)" }}>
						{totalItems}
					</span>{" "}
					项记录
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setPage(1)}
						disabled={page === 1}
						className="flex items-center justify-center w-8 h-8 rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-transparent hover:bg-[var(--color-bg-hover)] transition-colors"
						style={{
							color: "var(--color-text-secondary)",
							border: "1px solid var(--color-border-default)",
						}}
						title="首页"
					>
						<svg
							className="w-3.5 h-3.5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="square"
							strokeLinejoin="miter"
						>
							<path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
						</svg>
					</button>
					<button
						type="button"
						onClick={() => setPage((p) => Math.max(1, p - 1))}
						disabled={page === 1}
						className="flex items-center justify-center w-8 h-8 rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-transparent hover:bg-[var(--color-bg-hover)] transition-colors"
						style={{
							color: "var(--color-text-secondary)",
							border: "1px solid var(--color-border-default)",
						}}
						title="上一页"
					>
						<svg
							className="w-3.5 h-3.5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="square"
							strokeLinejoin="miter"
						>
							<path d="M15 18l-6-6 6-6" />
						</svg>
					</button>

					<div className="flex items-center gap-2 px-2">
						<span
							className="text-xs"
							style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
						>
							第
						</span>
						<input
							type="text"
							defaultValue={page}
							key={page}
							onKeyDown={handleJumpPage}
							className="w-10 h-8 text-center text-xs font-bold rounded outline-none bg-transparent"
							style={{
								color: "var(--color-text-primary)",
								border: "1px solid var(--color-border-default)",
								fontFamily: "var(--font-mono)",
							}}
							onFocus={(e) => {
								e.currentTarget.style.borderColor = "var(--color-amber-500)";
							}}
							onBlur={(e) => {
								e.currentTarget.style.borderColor = "var(--color-border-default)";
								e.currentTarget.value = String(page);
							}}
						/>
						<span
							className="text-xs"
							style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
						>
							/ {totalPages} 页
						</span>
					</div>

					<button
						type="button"
						onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
						disabled={page >= totalPages}
						className="flex items-center justify-center w-8 h-8 rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-transparent hover:bg-[var(--color-bg-hover)] transition-colors"
						style={{
							color: "var(--color-text-secondary)",
							border: "1px solid var(--color-border-default)",
						}}
						title="下一页"
					>
						<svg
							className="w-3.5 h-3.5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="square"
							strokeLinejoin="miter"
						>
							<path d="M9 18l6-6-6-6" />
						</svg>
					</button>
					<button
						type="button"
						onClick={() => setPage(totalPages)}
						disabled={page >= totalPages}
						className="flex items-center justify-center w-8 h-8 rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-transparent hover:bg-[var(--color-bg-hover)] transition-colors"
						style={{
							color: "var(--color-text-secondary)",
							border: "1px solid var(--color-border-default)",
						}}
						title="尾页"
					>
						<svg
							className="w-3.5 h-3.5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="square"
							strokeLinejoin="miter"
						>
							<path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
						</svg>
					</button>
				</div>
			</div>
		</div>
	);
}
