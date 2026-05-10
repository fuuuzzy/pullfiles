import type { Episode, EpisodeStatus } from "@ls-pull-video/shared";
import { useRetryAllFailed, useRetryEpisode } from "../../hooks/useEpisodes.js";
import { FileSize } from "../Common/FileSize.js";
import { StatusBadge } from "../Common/StatusBadge.js";

interface EpisodeListProps {
	episodes: Episode[];
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
	{ value: "uploading", label: "上传中" },
	{ value: "uploaded", label: "已上传" },
	{ value: "failed", label: "失败" },
];

export function EpisodeList({
	episodes,
	filter,
	onFilterChange,
	counts,
	isLoading,
}: EpisodeListProps) {
	const total = Object.values(counts).reduce((a, b) => a + b, 0);
	const retryEpisode = useRetryEpisode();
	const retryAll = useRetryAllFailed();

	return (
		<div
			className="rounded-xl border overflow-hidden"
			style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-border-subtle)" }}
		>
			{/* Filter bar */}
			<div
				className="px-5 py-3 border-b flex items-center justify-between"
				style={{ borderColor: "var(--color-border-subtle)" }}
			>
				<div className="flex items-center gap-1">
					{filters.map((f) => {
						const count = f.value === "all" ? total : counts[f.value];
						return (
							<button
								key={f.value}
								onClick={() => onFilterChange(f.value)}
								className="px-3 py-1.5 rounded-md text-[11px] tracking-wide transition-all duration-150 cursor-pointer bg-transparent border-none"
								style={{
									color: filter === f.value ? "var(--color-amber-300)" : "var(--color-text-muted)",
									background: filter === f.value ? "var(--color-amber-glow)" : "transparent",
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
						onClick={() => retryAll.mutate()}
						disabled={retryAll.isPending}
						className="px-3 py-1.5 rounded-md text-[11px] tracking-wide transition-all duration-150 cursor-pointer border flex items-center gap-1 disabled:opacity-50"
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

			{/* Table header */}
			<div
				className="grid px-6 py-4 gap-4 text-[10px] font-bold tracking-[0.2em] uppercase"
				style={{
					gridTemplateColumns: "80px minmax(200px, 3fr) minmax(180px, 1.5fr) 100px 130px",
					color: "var(--color-text-secondary)",
					fontFamily: "var(--font-mono)",
					background: "var(--color-bg-surface)",
					borderBottom: "1px solid var(--color-border-default)",
				}}
			>
				<div>集数</div>
				<div>文件信息</div>
				<div>时间</div>
				<div className="text-right">大小</div>
				<div className="text-right">状态</div>
			</div>

			{/* Rows */}
			<div className="flex flex-col">
				{isLoading ? (
					Array.from({ length: 15 }).map((_, i) => (
						<div
							key={i}
							className="grid px-6 py-5 gap-4 items-center"
							style={{
								gridTemplateColumns: "80px minmax(200px, 3fr) minmax(180px, 1.5fr) 100px 130px",
								borderBottom: "1px solid var(--color-border-subtle)",
							}}
						>
							<div>
								<div className="h-3 w-8 bg-[var(--color-border-default)] opacity-30 rounded animate-pulse"></div>
							</div>
							<div className="flex flex-col gap-2">
								<div className="h-3 w-3/4 bg-[var(--color-border-default)] opacity-30 rounded animate-pulse"></div>
								<div className="h-2 w-1/3 bg-[var(--color-border-default)] opacity-20 rounded animate-pulse"></div>
							</div>
							<div className="flex flex-col gap-2">
								<div className="h-2 w-2/3 bg-[var(--color-border-default)] opacity-30 rounded animate-pulse"></div>
								<div className="h-2 w-1/2 bg-[var(--color-border-default)] opacity-20 rounded animate-pulse"></div>
							</div>
							<div className="flex justify-end">
								<div className="h-3 w-12 bg-[var(--color-border-default)] opacity-30 rounded animate-pulse"></div>
							</div>
							<div className="flex justify-end">
								<div className="h-5 w-16 bg-[var(--color-border-default)] opacity-30 rounded-full animate-pulse"></div>
							</div>
						</div>
					))
				) : episodes.length === 0 ? (
					<div className="px-5 py-12 text-center">
						<p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
							未找到剧集
						</p>
					</div>
				) : (
					episodes.map((ep, i) => {
						const pathParts = ep.baidu_path.split("/");
						const parentFolder = pathParts.length > 1 ? pathParts[pathParts.length - 2] : "";

						return (
							<div
								key={ep.id}
								className="grid px-6 py-5 gap-4 items-center group relative transition-colors duration-150 even:bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-hover)] animate-fade-in"
								style={{
									gridTemplateColumns: "80px minmax(200px, 3fr) minmax(180px, 1.5fr) 100px 130px",
									animationDelay: `${i * 30}ms`,
									animationFillMode: "backwards",
									borderBottom: "1px solid var(--color-border-subtle)",
								}}
							>
								<div className="absolute left-0 top-0 bottom-0 w-[2px] bg-transparent group-hover:bg-[var(--color-amber-500)] transition-colors" />

								{/* Col 1: Episode */}
								<div
									className="text-xs font-bold tabular-nums"
									style={{
										color: ep.episode_number ? "var(--color-amber-400)" : "var(--color-text-muted)",
										fontFamily: "var(--font-mono)",
									}}
								>
									{ep.episode_number
										? `[ ${String(ep.episode_number).padStart(2, "0")} ]`
										: "[ -- ]"}
								</div>

								{/* Col 2: Filename, Link & Folder */}
								<div className="flex flex-col gap-1.5 min-w-0 pr-4">
									<div className="flex items-center gap-3">
										<div
											className="text-sm font-bold truncate"
											style={{ color: "var(--color-text-primary)" }}
											title={ep.filename}
										>
											{ep.filename}
										</div>
										{ep.status === "uploaded" && ep.r2_url && (
											<a
												href={ep.r2_url}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex text-[10px] px-2 py-0.5 rounded border hover:bg-[var(--color-bg-hover)] transition-colors font-normal items-center gap-1.5 shrink-0"
												style={{
													color: "var(--color-amber-400)",
													borderColor: "var(--color-amber-500)",
													textDecoration: "none",
												}}
												title="点击播放视频"
											>
												<svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
													<polygon points="5 3 19 12 5 21 5 3" />
												</svg>
												播放链接
											</a>
										)}
									</div>
									{parentFolder && (
										<div
											className="text-[11px] truncate flex items-center gap-1.5"
											style={{ color: "var(--color-text-muted)" }}
											title={parentFolder}
										>
											<svg
												className="w-3.5 h-3.5 shrink-0"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="1.5"
											>
												<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
											</svg>
											{parentFolder}
										</div>
									)}
								</div>

								{/* Col 3: Time & Error */}
								<div className="flex flex-col gap-1.5 justify-center min-w-0 pr-2">
									{ep.status === "uploaded" && ep.r2_uploaded_at ? (
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
												<polyline points="20 6 9 17 4 12"></polyline>
											</svg>
											上传于:{" "}
											{new Date(`${ep.r2_uploaded_at}Z`).toLocaleString("zh-CN", {
												timeZone: "Asia/Shanghai",
												year: "numeric",
												month: "2-digit",
												day: "2-digit",
												hour: "2-digit",
												minute: "2-digit",
												second: "2-digit",
											})}
										</div>
									) : ep.status === "failed" && ep.error_message ? (
										<div
											className="text-[10px] flex items-center gap-1.5 truncate"
											style={{ color: "var(--color-status-failed)" }}
											title={ep.error_message}
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
											{ep.error_message}
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
											<circle cx="12" cy="12" r="10"></circle>
											<polyline points="12 6 12 12 16 14"></polyline>
										</svg>
										更新于:{" "}
										{new Date(`${ep.updated_at}Z`).toLocaleString("zh-CN", {
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
									<FileSize bytes={ep.file_size} />
								</div>
								<div className="text-right flex justify-end items-center gap-2">
									{ep.status === "failed" && (
										<button
											onClick={() => retryEpisode.mutate(ep.id)}
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
									<StatusBadge status={ep.status} />
								</div>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
