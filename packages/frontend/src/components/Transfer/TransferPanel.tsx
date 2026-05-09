import { useStartTransfer, useCancelTransfer } from "../../hooks/useEpisodes.js";

export function TransferPanel({ pendingCount }: { pendingCount: number }) {
	const start = useStartTransfer();
	const cancel = useCancelTransfer();

	return (
		<div
			className="rounded-xl p-5 border"
			style={{
				background: "var(--color-bg-elevated)",
				borderColor: "var(--color-border-subtle)",
			}}
		>
			<div className="flex items-center justify-between">
				<div>
					<div className="flex items-center gap-2 mb-2">
						<div
							className="w-1.5 h-1.5 rounded-full"
							style={{ background: "var(--color-amber-500)" }}
						/>
						<span
							className="text-[10px] tracking-[0.2em] uppercase font-bold"
							style={{ color: "var(--color-amber-400)", fontFamily: "var(--font-mono)" }}
						>
							传输控制
						</span>
					</div>
					<p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
						<span
							className="tabular-nums"
							style={{ fontFamily: "var(--font-mono)", color: "var(--color-amber-300)" }}
						>
							{pendingCount}
						</span>{" "}
						个文件等待传输
					</p>
				</div>

				<div className="flex gap-2">
					<button
						onClick={() => cancel.mutate()}
						disabled={cancel.isPending}
						className="px-4 py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
						style={{
							background: "var(--color-bg-surface)",
							color: "var(--color-status-failed)",
							border: "1px solid rgba(239, 68, 68, 0.2)",
							fontFamily: "var(--font-mono)",
						}}
					>
						取消
					</button>
					<button
						onClick={() => start.mutate()}
						disabled={start.isPending || pendingCount === 0}
						className="px-5 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
						style={{
							background: start.isPending ? "var(--color-bg-surface)" : "var(--color-amber-500)",
							color: start.isPending ? "var(--color-text-muted)" : "#000",
							border: "none",
							fontFamily: "var(--font-mono)",
						}}
					>
						{start.isPending ? "启动中..." : "开始传输"}
					</button>
				</div>
			</div>
		</div>
	);
}
