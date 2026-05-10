import type { ApiLog } from "@ls-pull-video/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client.js";

export function LogsPage() {
	const queryClient = useQueryClient();

	const { data: logs = [], isLoading } = useQuery({
		queryKey: ["logs"],
		queryFn: () => apiFetch<ApiLog[]>("/api/logs?limit=100"),
		refetchInterval: 5000,
	});

	const clearMutation = useMutation({
		mutationFn: () => apiFetch("/api/logs/clear", { method: "POST" }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["logs"] });
		},
	});

	return (
		<div className="p-6 md:p-8 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1
						className="text-xl font-bold tracking-wide"
						style={{ color: "var(--color-text-primary)" }}
					>
						API 日志
					</h1>
					<p
						className="text-xs mt-1 tracking-wider"
						style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
					>
						百度云接口调用记录
					</p>
				</div>
				<button
					type="button"
					onClick={() => clearMutation.mutate()}
					disabled={clearMutation.isPending || logs.length === 0}
					className="px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-bg-hover)] border"
					style={{
						background: "transparent",
						color: "var(--color-text-secondary)",
						borderColor: "var(--color-border-subtle)",
						fontFamily: "var(--font-mono)",
					}}
				>
					{clearMutation.isPending ? "清理中..." : "清空日志"}
				</button>
			</div>

			<div className="card-cyber">
				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr
								className="text-[10px] font-bold uppercase tracking-[0.2em]"
								style={{
									color: "var(--color-text-secondary)",
									fontFamily: "var(--font-mono)",
									background: "var(--color-bg-surface)",
									borderBottom: "1px solid var(--color-border-default)",
								}}
							>
								<th className="px-5 py-3.5 font-bold w-40">时间</th>
								<th className="px-5 py-3.5 font-bold w-24">方法</th>
								<th className="px-5 py-3.5 font-bold">URL</th>
								<th className="px-5 py-3.5 font-bold w-24">状态</th>
								<th className="px-5 py-3.5 font-bold w-24">耗时</th>
								<th className="px-5 py-3.5 font-bold">响应</th>
							</tr>
						</thead>
						<tbody className="text-sm">
							{isLoading ? (
								Array.from({ length: 10 }).map((_, i) => (
									<tr key={i} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
										<td className="px-5 py-4">
											<div className="h-3 w-24 bg-[var(--color-border-default)] opacity-30 rounded animate-pulse"></div>
										</td>
										<td className="px-5 py-4">
											<div className="h-5 w-12 bg-[var(--color-border-default)] opacity-30 rounded animate-pulse"></div>
										</td>
										<td className="px-5 py-4">
											<div className="h-3 w-48 bg-[var(--color-border-default)] opacity-30 rounded animate-pulse"></div>
										</td>
										<td className="px-5 py-4">
											<div className="h-5 w-16 bg-[var(--color-border-default)] opacity-30 rounded animate-pulse"></div>
										</td>
										<td className="px-5 py-4">
											<div className="h-3 w-12 bg-[var(--color-border-default)] opacity-30 rounded animate-pulse"></div>
										</td>
										<td className="px-5 py-4">
											<div className="h-3 w-32 bg-[var(--color-border-default)] opacity-30 rounded animate-pulse"></div>
										</td>
									</tr>
								))
							) : logs.length === 0 ? (
								<tr>
									<td
										colSpan={6}
										className="px-5 py-12 text-center text-sm"
										style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
									>
										暂无日志记录
									</td>
								</tr>
							) : (
								logs.map((log) => (
									<tr
										key={log.id}
										className="group relative transition-colors duration-150 even:bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-hover)]"
										style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
									>
										<td
											className="px-5 py-3.5 whitespace-nowrap text-xs relative"
											style={{
												color: "var(--color-text-secondary)",
												fontFamily: "var(--font-mono)",
											}}
										>
											<div className="absolute left-0 top-0 bottom-0 w-[2px] bg-transparent group-hover:bg-[var(--color-amber-500)] transition-colors" />
											{new Date(`${log.created_at}Z`).toLocaleString("zh-CN", {
												timeZone: "Asia/Shanghai",
												year: "numeric",
												month: "2-digit",
												day: "2-digit",
												hour: "2-digit",
												minute: "2-digit",
												second: "2-digit",
											})}
										</td>
										<td className="px-5 py-3.5 whitespace-nowrap">
											<span
												className="px-2.5 py-1 rounded text-[10px] font-bold"
												style={{
													background:
														log.method === "GET"
															? "var(--color-amber-glow)"
															: "var(--color-bg-elevated)",
													color:
														log.method === "GET"
															? "var(--color-amber-500)"
															: "var(--color-text-primary)",
												}}
											>
												{log.method}
											</span>
										</td>
										<td
											className="px-5 py-3.5 text-xs break-all"
											style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}
										>
											{log.url}
											{log.request_params && log.request_params !== "{}" && (
												<div className="mt-1.5 text-[10px] opacity-70">{log.request_params}</div>
											)}
										</td>
										<td className="px-5 py-3.5 whitespace-nowrap">
											<span
												className="px-2.5 py-1 rounded text-[10px] font-bold"
												style={{
													background:
														log.response_status >= 400
															? "rgba(239, 68, 68, 0.1)"
															: "rgba(34, 197, 94, 0.1)",
													color: log.response_status >= 400 ? "#ef4444" : "#22c55e",
													border:
														log.response_status >= 400
															? "1px solid rgba(239, 68, 68, 0.2)"
															: "1px solid rgba(34, 197, 94, 0.2)",
												}}
											>
												{log.response_status}
											</span>
										</td>
										<td
											className="px-5 py-3.5 whitespace-nowrap text-xs"
											style={{
												color: "var(--color-text-secondary)",
												fontFamily: "var(--font-mono)",
											}}
										>
											{log.duration_ms}ms
										</td>
										<td
											className="px-5 py-3.5 text-[10px] truncate max-w-xs"
											style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
											title={log.response_body || ""}
										>
											{log.response_body}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
