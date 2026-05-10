import type { Episode, ProgressEvent } from "@ls-pull-video/shared";
import { useRetryEpisode } from "../../hooks/useEpisodes.js";
import { ProgressBar } from "../Common/ProgressBar.js";
import { StatusBadge } from "../Common/StatusBadge.js";

interface TransferLogProps {
	activeEpisodes: Episode[];
	recentEpisodes: Episode[];
	progressMap: Record<number, ProgressEvent>;
	isLoading?: boolean;
}

export function TransferLog({
	activeEpisodes,
	recentEpisodes,
	progressMap,
	isLoading,
}: TransferLogProps) {
	const retryEpisode = useRetryEpisode();

	return (
		<div className="space-y-4">
			{/* Active transfers */}
			{(isLoading || activeEpisodes.length > 0) && (
				<div
					className="rounded-xl border overflow-hidden"
					style={{
						background: "var(--color-bg-elevated)",
						borderColor: "var(--color-border-subtle)",
					}}
				>
					<div
						className="px-5 py-3 border-b flex items-center gap-2"
						style={{ borderColor: "var(--color-border-subtle)" }}
					>
						<div
							className="w-2 h-2 rounded-full animate-pulse-glow"
							style={{ background: "var(--color-status-downloading)" }}
						/>
						<span
							className="text-[10px] tracking-[0.2em] uppercase font-bold"
							style={{ color: "var(--color-status-downloading)", fontFamily: "var(--font-mono)" }}
						>
							进行中 ({activeEpisodes.length})
						</span>
					</div>
					<div className="flex flex-col">
						{isLoading
							? Array.from({ length: 2 }).map((_, i) => (
									<div
										key={i}
										className="px-6 py-5"
										style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
									>
										<div className="flex items-center justify-between mb-3">
											<div className="h-3 w-64 bg-[var(--color-border-default)] opacity-30 rounded animate-pulse"></div>
											<div className="h-5 w-16 bg-[var(--color-border-default)] opacity-30 rounded-full animate-pulse"></div>
										</div>
										<div className="h-1.5 w-full bg-[var(--color-border-default)] opacity-30 rounded-full animate-pulse"></div>
									</div>
								))
							: activeEpisodes.map((ep) => {
									const pathParts = ep.baidu_path.split("/");
									const parentFolder = pathParts.length > 1 ? pathParts[pathParts.length - 2] : "";

									return (
										<div
											key={ep.id}
											className="px-6 py-5 group relative transition-colors duration-150 even:bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-hover)]"
											style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
										>
											<div className="absolute left-0 top-0 bottom-0 w-[2px] bg-transparent group-hover:bg-[var(--color-status-downloading)] transition-colors" />
											<div className="flex items-center justify-between mb-3">
												<div className="flex-1 min-w-0 pr-4">
													<div
														className="text-sm font-bold truncate"
														style={{ color: "var(--color-text-primary)" }}
													>
														{ep.filename}
													</div>
													<div className="flex items-center gap-2 mt-0.5">
														{parentFolder && (
															<div
																className="text-[10px] truncate"
																style={{ color: "var(--color-text-muted)" }}
															>
																📁 {parentFolder}
															</div>
														)}
														<div
															className="text-[10px] ml-auto"
															style={{
																color: "var(--color-text-muted)",
																fontFamily: "var(--font-mono)",
															}}
														>
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
												</div>
												<StatusBadge status={ep.status} />
											</div>
											<ProgressBar progress={progressMap[ep.id]} />
										</div>
									);
								})}
					</div>
				</div>
			)}

			{/* Recent completed/failed */}
			{(isLoading || recentEpisodes.length > 0) && (
				<div
					className="rounded-xl border overflow-hidden"
					style={{
						background: "var(--color-bg-elevated)",
						borderColor: "var(--color-border-subtle)",
					}}
				>
					<div
						className="px-5 py-3 border-b flex items-center gap-2"
						style={{ borderColor: "var(--color-border-subtle)" }}
					>
						<span
							className="text-[10px] tracking-[0.2em] uppercase font-bold"
							style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
						>
							最近完成
						</span>
					</div>
					<div className="flex flex-col">
						{isLoading
							? Array.from({ length: 5 }).map((_, i) => (
									<div
										key={i}
										className="px-6 py-5 flex items-center justify-between gap-6"
										style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
									>
										<div className="h-3 w-48 bg-[var(--color-border-default)] opacity-30 rounded animate-pulse"></div>
										<div className="h-5 w-16 bg-[var(--color-border-default)] opacity-30 rounded-full animate-pulse"></div>
									</div>
								))
							: recentEpisodes.map((ep) => {
									const pathParts = ep.baidu_path.split("/");
									const parentFolder = pathParts.length > 1 ? pathParts[pathParts.length - 2] : "";

									return (
										<div
											key={ep.id}
											className="px-6 py-5 flex items-center justify-between gap-6 group relative transition-colors duration-150 even:bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-hover)]"
											style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
										>
											<div className="absolute left-0 top-0 bottom-0 w-[2px] bg-transparent group-hover:bg-[var(--color-amber-500)] transition-colors" />
											<div className="flex-1 min-w-0 py-1">
												<div className="flex items-center gap-3 w-full">
													<div
														className="text-sm font-bold truncate"
														style={{ color: "var(--color-text-secondary)" }}
													>
														{ep.filename}
													</div>
													{ep.status === "uploaded" && ep.r2_url && (
														<a
															href={ep.r2_url}
															target="_blank"
															rel="noopener noreferrer"
															className="text-[10px] px-2 py-0.5 rounded border hover:bg-[var(--color-bg-hover)] transition-colors font-normal flex items-center gap-1.5 shrink-0"
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
												<div className="flex items-center gap-6 mt-3 flex-wrap">
													{parentFolder && (
														<div
															className="text-[10px] truncate flex items-center gap-1"
															style={{ color: "var(--color-text-muted)" }}
														>
															<svg
																className="w-3 h-3"
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
													{ep.status === "failed" && ep.error_message && (
														<div
															className="text-[10px] truncate max-w-sm flex items-center gap-1"
															style={{ color: "var(--color-status-failed)" }}
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
													)}
													{ep.status === "uploaded" && ep.r2_uploaded_at && (
														<div
															className="text-[10px] flex items-center gap-1"
															style={{ color: "var(--color-text-muted)" }}
														>
															<svg
																className="w-3 h-3"
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
													)}
													<div
														className="text-[10px] ml-auto flex items-center gap-1"
														style={{
															color: "var(--color-text-muted)",
															fontFamily: "var(--font-mono)",
														}}
													>
														<svg
															className="w-3 h-3"
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
											</div>
											<div className="flex items-center gap-2">
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
								})}
					</div>
				</div>
			)}

			{!isLoading && activeEpisodes.length === 0 && recentEpisodes.length === 0 && (
				<div
					className="rounded-xl p-12 border text-center"
					style={{
						background: "var(--color-bg-elevated)",
						borderColor: "var(--color-border-subtle)",
					}}
				>
					<div className="mb-4 flex justify-center" style={{ color: "var(--color-text-muted)" }}>
						<svg
							className="w-10 h-10 opacity-50"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="square"
							strokeLinejoin="miter"
						>
							<path d="M16 3l5 5-5 5" />
							<path d="M21 8H3" />
							<path d="M8 21l-5-5 5-5" />
							<path d="M3 16h18" />
						</svg>
					</div>
					<p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
						暂无活跃的传输任务
					</p>
					<p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
						从仪表盘启动传输以开始处理文件
					</p>
				</div>
			)}
		</div>
	);
}
