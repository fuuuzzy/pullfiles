import type { Episode } from "@ls-pull-video/shared";
import { FileSize } from "../Common/FileSize.js";
import { StatusBadge } from "../Common/StatusBadge.js";

export function RecentActivity({
	episodes,
	isLoading,
}: {
	episodes: Episode[];
	isLoading?: boolean;
}) {
	const recent = episodes
		.filter((e) => e.status !== "pending" && e.status !== "unparsed")
		.sort((a, b) => new Date(`${b.updated_at}Z`).getTime() - new Date(`${a.updated_at}Z`).getTime())
		.slice(0, 8);

	if (!isLoading && recent.length === 0) {
		return (
			<div
				className="rounded-xl p-8 border text-center"
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
						<rect x="3" y="3" width="18" height="18" />
						<path d="M3 9h18M9 21V9" />
					</svg>
				</div>
				<p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
					暂无传输记录
				</p>
				<p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
					同步文件夹并开始传输后，记录将显示在此处
				</p>
			</div>
		);
	}

	return (
		<div
			className="rounded-xl border overflow-hidden"
			style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-border-subtle)" }}
		>
			<div
				className="px-5 py-3.5 border-b flex items-center gap-2"
				style={{ borderColor: "var(--color-border-subtle)" }}
			>
				<div
					className="w-1.5 h-1.5 rounded-full"
					style={{ background: "var(--color-amber-500)" }}
				/>
				<span
					className="text-[10px] tracking-[0.2em] uppercase font-bold"
					style={{ color: "var(--color-amber-400)", fontFamily: "var(--font-mono)" }}
				>
					最近动态
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
								<div className="flex-1 min-w-0">
									<div className="h-3 w-48 bg-[var(--color-border-default)] opacity-30 rounded animate-pulse mb-2"></div>
									<div className="h-2 w-16 bg-[var(--color-border-default)] opacity-30 rounded animate-pulse"></div>
								</div>
								<div className="h-3 w-12 bg-[var(--color-border-default)] opacity-30 rounded animate-pulse"></div>
								<div className="h-5 w-16 bg-[var(--color-border-default)] opacity-30 rounded-full animate-pulse"></div>
							</div>
						))
					: recent.map((ep) => {
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
												style={{ color: "var(--color-text-primary)" }}
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
											<div
												className="text-[10px] font-bold flex items-center"
												style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
											>
												{ep.episode_number
													? `[ ${String(ep.episode_number).padStart(2, "0")} ]`
													: "[ -- ]"}
											</div>
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
												style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
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
									<FileSize bytes={ep.file_size} />
									<StatusBadge status={ep.status} />
								</div>
							);
						})}
			</div>
		</div>
	);
}
