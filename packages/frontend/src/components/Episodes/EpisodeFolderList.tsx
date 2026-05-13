import type { Episode, EpisodeStatus } from "@ls-pull-video/shared";
import { useState } from "react";
import { useRetryAllFailed, useRetryEpisode } from "../../hooks/useEpisodes.js";
import { FileSize } from "../Common/FileSize.js";
import { StatusBadge } from "../Common/StatusBadge.js";

interface EpisodeFolderData {
	folder: string;
	episodes: Episode[];
	count: number;
}

interface EpisodeFolderListProps {
	folders: EpisodeFolderData[];
	filter: EpisodeStatus | "all";
	onFilterChange: (f: EpisodeStatus | "all") => void;
	counts: Record<EpisodeStatus, number>;
	isLoading?: boolean;
}

const filters: { value: EpisodeStatus | "all"; label: string }[] = [
	{ value: "all", label: "全部" },
	{ value: "pending", label: "队列中" },
	{ value: "unparsed", label: "未解析" },
	{ value: "downloading", label: "下载中" },
	{ value: "downloaded", label: "已下载" },
	{ value: "compressing", label: "压缩中" },
	{ value: "uploading", label: "上传中" },
	{ value: "uploaded", label: "已上传" },
	{ value: "failed", label: "失败" },
];

function FolderIcon() {
	return (
		<svg
			className="w-4 h-4 shrink-0"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
		>
			<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
		</svg>
	);
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
	return (
		<svg
			className="w-3.5 h-3.5 transition-transform duration-200"
			style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		>
			<path d="M9 18l6-6-6-6" />
		</svg>
	);
}

function isVideoEpisode(ep: Episode): boolean {
	const ct = ep.content_type ?? "";
	return ct.startsWith("video/");
}

function EpisodeRow({ episode }: { episode: Episode }) {
	const retryEpisode = useRetryEpisode();

	return (
		<div
			className="grid px-6 py-4 gap-4 items-center group relative transition-colors duration-150 even:bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-hover)]"
			style={{
				gridTemplateColumns: "80px minmax(200px, 3fr) minmax(180px, 1.5fr) 100px 130px",
				borderBottom: "1px solid var(--color-border-subtle)",
			}}
		>
			<div className="absolute left-0 top-0 bottom-0 w-[2px] bg-transparent group-hover:bg-[var(--color-amber-500)] transition-colors" />

			{/* Col 1: Episode / File type */}
			<div
				className="text-xs font-bold tabular-nums"
				style={{
					color: episode.episode_number
						? "var(--color-amber-400)"
						: "var(--color-text-muted)",
					fontFamily: "var(--font-mono)",
				}}
			>
				{episode.episode_number
					? `[ ${String(episode.episode_number).padStart(2, "0")} ]`
					: isVideoEpisode(episode)
						? "[ -- ]"
						: "[ 图 ]"}
			</div>

			{/* Col 2: Filename */}
			<div className="flex flex-col gap-1.5 min-w-0 pr-4">
				<div className="flex items-center gap-3">
					<div
						className="text-sm font-bold truncate"
						style={{ color: "var(--color-text-primary)" }}
						title={episode.filename}
					>
						{episode.filename}
					</div>
					{episode.status === "uploaded" && episode.r2_url && (
						<a
							href={episode.r2_url}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex text-[10px] px-2 py-0.5 rounded border hover:bg-[var(--color-bg-hover)] transition-colors font-normal items-center gap-1.5 shrink-0"
							style={{
								color: "var(--color-amber-400)",
								borderColor: "var(--color-amber-500)",
								textDecoration: "none",
							}}
							title="点击播放/查看"
						>
							{isVideoEpisode(episode) ? (
								<svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
									<polygon points="5 3 19 12 5 21 5 3" />
								</svg>
							) : (
								<svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
									<rect x="3" y="3" width="18" height="18" rx="2" />
									<circle cx="8.5" cy="8.5" r="1.5" />
									<path d="M21 15l-5-5L5 21" />
								</svg>
							)}
							{isVideoEpisode(episode) ? "播放链接" : "查看图片"}
						</a>
					)}
				</div>
			</div>

			{/* Col 3: Time & Error */}
			<div className="flex flex-col gap-1.5 justify-center min-w-0 pr-2">
				{episode.status === "uploaded" && episode.r2_uploaded_at ? (
					<div
						className="text-[10px] flex items-center gap-1.5 truncate"
						style={{ color: "var(--color-text-muted)" }}
					>
						<svg
							className="w-3 h-3 shrink-0"
							style={{ color: "var(--color-status-uploaded)" }}
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<polyline points="20 6 9 17 4 12" />
						</svg>
						上传于:{" "}
						{new Date(`${episode.r2_uploaded_at}Z`).toLocaleString("zh-CN", {
							timeZone: "Asia/Shanghai",
							year: "numeric",
							month: "2-digit",
							day: "2-digit",
							hour: "2-digit",
							minute: "2-digit",
							second: "2-digit",
						})}
					</div>
				) : episode.status === "failed" && episode.error_message ? (
					<div
						className="text-[10px] flex items-center gap-1.5 truncate"
						style={{ color: "var(--color-status-failed)" }}
						title={episode.error_message}
					>
						<svg
							className="w-3 h-3 shrink-0"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
						{episode.error_message}
					</div>
				) : null}
				<div
					className="text-[10px] flex items-center gap-1.5 truncate"
					style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
				>
					<svg
						className="w-3 h-3 shrink-0"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
					>
						<circle cx="12" cy="12" r="10" />
						<polyline points="12 6 12 12 16 14" />
					</svg>
					更新于:{" "}
					{new Date(`${episode.updated_at}Z`).toLocaleString("zh-CN", {
						timeZone: "Asia/Shanghai",
						year: "numeric",
						month: "2-digit",
						day: "2-digit",
						hour: "2-digit",
						minute: "2-digit",
						second: "2-digit",
					})}
				</div>
			</div>

			{/* Col 4: Size */}
			<div className="text-right">
				<FileSize bytes={episode.file_size} />
			</div>

			{/* Col 5: Status */}
			<div className="text-right flex justify-end items-center gap-2">
				{episode.status === "failed" && (
					<button
						type="button"
						onClick={() => retryEpisode.mutate(episode.id)}
						disabled={retryEpisode.isPending}
						className="p-1 rounded hover:bg-[var(--color-bg-elevated)] transition-colors disabled:opacity-50 cursor-pointer"
						title="重试该任务"
						style={{ color: "var(--color-text-muted)" }}
					>
						<svg
							className="w-3.5 h-3.5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
					</button>
				)}
				<StatusBadge status={episode.status} />
			</div>
		</div>
	);
}

function FolderGroup({ folder, episodes }: { folder: string; episodes: Episode[] }) {
	const [expanded, setExpanded] = useState(false);
	const folderName = folder === "(未分类)" ? folder : folder.split("/").pop() ?? folder;

	const statusCounts: Record<string, number> = {};
	for (const ep of episodes) {
		statusCounts[ep.status] = (statusCounts[ep.status] ?? 0) + 1;
	}

	return (
		<div
			className="rounded-xl border overflow-hidden"
			style={{
				background: "var(--color-bg-elevated)",
				borderColor: "var(--color-border-subtle)",
			}}
		>
			{/* Folder header */}
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="w-full px-5 py-3.5 flex items-center gap-3 cursor-pointer bg-transparent border-none text-left hover:bg-[var(--color-bg-hover)] transition-colors"
				style={{ borderBottom: expanded ? "1px solid var(--color-border-subtle)" : "none" }}
			>
				<ChevronIcon expanded={expanded} />
				<div
					className="shrink-0"
					style={{ color: "var(--color-amber-400)" }}
				>
					<FolderIcon />
				</div>
				<div className="flex-1 min-w-0">
					<div
						className="text-sm font-bold truncate"
						style={{ color: "var(--color-text-primary)" }}
						title={folder}
					>
						{folderName}
					</div>
					<div
						className="text-[10px] truncate"
						style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
						title={folder}
					>
						{folder}
					</div>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<span
						className="text-[10px] tabular-nums"
						style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
					>
						{episodes.length} 个文件
					</span>
					{Object.entries(statusCounts).map(([status, count]) => (
						<StatusBadge key={status} status={status as EpisodeStatus} />
					))}
				</div>
			</button>

			{/* Episode rows */}
			{expanded && (
				<div className="flex flex-col">
					{/* Table header */}
					<div
						className="grid px-6 py-3 gap-4 text-[10px] font-bold tracking-[0.2em] uppercase"
						style={{
							gridTemplateColumns: "80px minmax(200px, 3fr) minmax(180px, 1.5fr) 100px 130px",
							color: "var(--color-text-secondary)",
							fontFamily: "var(--font-mono)",
							background: "var(--color-bg-surface)",
							borderBottom: "1px solid var(--color-border-default)",
						}}
					>
						<div>类型</div>
						<div>文件信息</div>
						<div>时间</div>
						<div className="text-right">大小</div>
						<div className="text-right">状态</div>
					</div>
					{episodes.map((ep) => (
						<EpisodeRow key={ep.id} episode={ep} />
					))}
				</div>
			)}
		</div>
	);
}

const FOLDERS_PER_PAGE = 20;

export function EpisodeFolderList({
	folders,
	filter,
	onFilterChange,
	counts,
	isLoading,
}: EpisodeFolderListProps) {
	const total = Object.values(counts).reduce((a, b) => a + b, 0);
	const retryAll = useRetryAllFailed();
	const [page, setPage] = useState(1);

	const totalPages = Math.max(1, Math.ceil(folders.length / FOLDERS_PER_PAGE));
	const pagedFolders = folders.slice(
		(page - 1) * FOLDERS_PER_PAGE,
		page * FOLDERS_PER_PAGE,
	);

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
		<div className="space-y-4">
			{/* Filter bar */}
			<div
				className="rounded-xl border px-5 py-3 flex items-center justify-between flex-wrap gap-2"
				style={{
					background: "var(--color-bg-elevated)",
					borderColor: "var(--color-border-subtle)",
				}}
			>
				<div className="flex items-center gap-1.5 flex-wrap">
					{filters.map((f) => {
						const count = f.value === "all" ? total : counts[f.value];
						return (
							<button
								key={f.value}
								type="button"
								onClick={() => { onFilterChange(f.value); setPage(1); }}
								className="px-3 py-1.5 rounded-md text-[11px] tracking-wide transition-all duration-150 cursor-pointer bg-transparent border-none"
								style={{
									color:
										filter === f.value
											? "var(--color-amber-300)"
											: "var(--color-text-muted)",
									background:
										filter === f.value
											? "var(--color-amber-glow)"
											: "transparent",
									fontFamily: "var(--font-mono)",
								}}
							>
								{f.label}
								<span className="ml-1.5 opacity-60">{count}</span>
							</button>
						);
					})}
				</div>

				{counts.failed > 0 && (
					<button
						type="button"
						onClick={() => retryAll.mutate()}
						disabled={retryAll.isPending}
						className="px-3 py-1.5 rounded-md text-[11px] tracking-wide transition-all duration-150 cursor-pointer border flex items-center gap-1.5 disabled:opacity-50"
						style={{
							color: "var(--color-text-primary)",
							background: "var(--color-bg-surface)",
							borderColor: "var(--color-border-default)",
							fontFamily: "var(--font-mono)",
						}}
					>
						<svg
							className="w-3 h-3"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
						{retryAll.isPending ? "重试中..." : "重试全部失败"}
					</button>
				)}
			</div>

			{/* Folder groups */}
			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={i}
							className="rounded-xl border p-5 animate-pulse"
							style={{
								background: "var(--color-bg-elevated)",
								borderColor: "var(--color-border-subtle)",
							}}
						>
							<div className="flex items-center gap-3">
								<div className="h-4 w-4 bg-[var(--color-border-default)] opacity-30 rounded" />
								<div className="h-4 w-1/3 bg-[var(--color-border-default)] opacity-30 rounded" />
							</div>
						</div>
					))}
				</div>
			) : folders.length === 0 ? (
				<div
					className="rounded-xl border px-5 py-12 text-center"
					style={{
						background: "var(--color-bg-elevated)",
						borderColor: "var(--color-border-subtle)",
					}}
				>
					<p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
						未找到文件
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{pagedFolders.map((f) => (
						<FolderGroup
							key={f.folder}
							folder={f.folder}
							episodes={f.episodes}
						/>
					))}

					{/* Pagination */}
					{totalPages > 1 && (
						<div
							className="flex items-center justify-between pt-2"
						>
							<div
								className="text-xs"
								style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
							>
								共{" "}
								<span className="font-bold" style={{ color: "var(--color-text-primary)" }}>
									{folders.length}
								</span>{" "}
								个文件夹
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
									<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
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
									<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
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
									<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
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
									<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
										<path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
									</svg>
								</button>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
