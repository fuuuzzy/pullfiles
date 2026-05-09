import type { Episode } from "@ls-pull-video/shared";
import type { ProgressEvent } from "@ls-pull-video/shared";
import { StatusBadge } from "../Common/StatusBadge.js";
import { ProgressBar } from "../Common/ProgressBar.js";
import { useRetryEpisode } from "../../hooks/useEpisodes.js";

interface TransferLogProps {
	activeEpisodes: Episode[];
	recentEpisodes: Episode[];
	progressMap: Record<number, ProgressEvent>;
	isLoading?: boolean;
}

export function TransferLog({ activeEpisodes, recentEpisodes, progressMap, isLoading }: TransferLogProps) {
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
						{isLoading ? (
							Array.from({ length: 2 }).map((_, i) => (
								<div key={i} className="px-5 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
									<div className="flex items-center justify-between mb-3">
										<div className="h-3 w-64 bg-[var(--color-border-default)] opacity-30 rounded animate-pulse"></div>
										<div className="h-5 w-16 bg-[var(--color-border-default)] opacity-30 rounded-full animate-pulse"></div>
									</div>
									<div className="h-1.5 w-full bg-[var(--color-border-default)] opacity-30 rounded-full animate-pulse"></div>
								</div>
							))
						) : (
							activeEpisodes.map((ep) => {
								const pathParts = ep.baidu_path.split("/");
								const parentFolder = pathParts.length > 1 ? pathParts[pathParts.length - 2] : "";

								return (
									<div key={ep.id} className="px-5 py-4 group relative transition-colors duration-150 even:bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-hover)]" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
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
														<div className="text-[10px] truncate" style={{ color: "var(--color-text-muted)" }}>
															📁 {parentFolder}
														</div>
													)}
													<div className="text-[10px] ml-auto" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
														{new Date(ep.updated_at + "Z").toLocaleString("zh-CN", {
															timeZone: "Asia/Shanghai",
															month: "2-digit",
															day: "2-digit",
															hour: "2-digit",
															minute: "2-digit",
														})}
													</div>
												</div>
											</div>
											<StatusBadge status={ep.status} />
										</div>
										<ProgressBar progress={progressMap[ep.id]} />
									</div>
								);
							})
						)}
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
						{isLoading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<div key={i} className="px-5 py-3.5 flex items-center justify-between gap-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
									<div className="h-3 w-48 bg-[var(--color-border-default)] opacity-30 rounded animate-pulse"></div>
									<div className="h-5 w-16 bg-[var(--color-border-default)] opacity-30 rounded-full animate-pulse"></div>
								</div>
							))
						) : (
							recentEpisodes.map((ep) => {
								const pathParts = ep.baidu_path.split("/");
								const parentFolder = pathParts.length > 1 ? pathParts[pathParts.length - 2] : "";

								return (
									<div key={ep.id} className="px-5 py-3.5 flex items-center justify-between gap-4 group relative transition-colors duration-150 even:bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-hover)]" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
										<div className="absolute left-0 top-0 bottom-0 w-[2px] bg-transparent group-hover:bg-[var(--color-amber-500)] transition-colors" />
										<div className="flex-1 min-w-0">
											<div
												className="text-sm font-bold truncate"
												style={{ color: "var(--color-text-secondary)" }}
											>
												{ep.filename}
											</div>
											<div className="flex items-center gap-2 mt-0.5">
												{parentFolder && (
													<div className="text-[10px] truncate" style={{ color: "var(--color-text-muted)" }}>
														📁 {parentFolder}
													</div>
												)}
												{ep.status === "failed" && ep.error_message && (
													<div className="text-[10px] truncate max-w-sm" style={{ color: "var(--color-status-failed)" }}>
														⚠️ {ep.error_message}
													</div>
												)}
												<div className="text-[10px] ml-auto" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
													{new Date(ep.updated_at + "Z").toLocaleString("zh-CN", {
														timeZone: "Asia/Shanghai",
														month: "2-digit",
														day: "2-digit",
														hour: "2-digit",
														minute: "2-digit",
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
													<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
														<path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
						<svg className="w-10 h-10 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
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
