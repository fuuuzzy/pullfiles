import { useNavigate, useParams } from "react-router-dom";
import {
	useProject,
	useProjectEpisodes,
	useProjectStatus,
	useStartSync,
} from "../hooks/useProjects.js";

const STATUS_COLORS: Record<string, string> = {
	pending: "var(--color-text-muted)",
	downloading: "var(--color-amber-500)",
	uploaded: "var(--color-blue-500)",
	saved: "var(--color-green-500)",
	failed: "var(--color-red-500)",
};

const STATUS_LABELS: Record<string, string> = {
	pending: "待处理",
	downloading: "下载中",
	uploaded: "已上传",
	saved: "已保存",
	failed: "失败",
};

export function ProjectDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const projectId = Number(id);

	const { data: project, isLoading: projectLoading } = useProject(projectId);
	const { data: episodes = [], isLoading: episodesLoading } = useProjectEpisodes(projectId);
	const { data: status } = useProjectStatus(projectId);
	const startSyncMutation = useStartSync();

	if (projectLoading || episodesLoading) {
		return (
			<div className="p-6">
				<div className="text-center py-12">
					<span style={{ color: "var(--color-text-muted)" }}>加载中...</span>
				</div>
			</div>
		);
	}

	if (!project) {
		return (
			<div className="p-6">
				<div className="text-center py-12">
					<span style={{ color: "var(--color-text-muted)" }}>项目不存在</span>
				</div>
			</div>
		);
	}

	const handleStartSync = async () => {
		try {
			await startSyncMutation.mutateAsync(projectId);
		} catch (err) {
			alert(err instanceof Error ? err.message : "启动同步失败");
		}
	};

	return (
		<div className="p-6 space-y-6">
			<div className="flex items-center gap-4">
				<button
					type="button"
					onClick={() => navigate("/projects")}
					className="p-2 rounded transition-colors cursor-pointer"
					style={{ color: "var(--color-text-muted)" }}
				>
					<svg
						className="w-5 h-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<path d="M19 12H5M12 19l-7-7 7-7" />
					</svg>
				</button>
				<div className="flex-1">
					<h1
						className="text-xl font-bold tracking-wide"
						style={{ color: "var(--color-text-primary)" }}
					>
						{project.name}
					</h1>
					<p
						className="text-xs mt-1"
						style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
					>
						创建于 {new Date(project.created_at).toLocaleString()}
					</p>
				</div>
				<div className="flex items-center gap-2">
					{project.status === "created" || project.status === "failed" ? (
						<button
							type="button"
							onClick={handleStartSync}
							disabled={startSyncMutation.isPending}
							className="px-5 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
							style={{
								background: startSyncMutation.isPending
									? "var(--color-bg-surface)"
									: "var(--color-amber-500)",
								color: startSyncMutation.isPending ? "var(--color-text-muted)" : "#000",
								fontFamily: "var(--font-mono)",
							}}
						>
							{startSyncMutation.isPending ? "同步中..." : "开始同步"}
						</button>
					) : null}
				</div>
			</div>

			{status && (
				<div
					className="grid grid-cols-6 gap-4 rounded-xl p-5 border"
					style={{
						borderColor: "var(--color-border-subtle)",
						background: "var(--color-bg-elevated)",
					}}
				>
					<StatusCard label="总剧集" value={status.total} color="var(--color-text-primary)" />
					<StatusCard label="待处理" value={status.pending} color="var(--color-text-muted)" />
					<StatusCard label="下载中" value={status.downloading} color="var(--color-amber-500)" />
					<StatusCard label="已上传" value={status.uploaded} color="var(--color-blue-500)" />
					<StatusCard label="已保存" value={status.saved} color="var(--color-green-500)" />
					<StatusCard label="失败" value={status.failed} color="var(--color-red-500)" />
				</div>
			)}

			<div>
				<h2 className="text-sm font-medium mb-3" style={{ color: "var(--color-text-secondary)" }}>
					剧集列表
				</h2>
				<div
					className="rounded-xl overflow-hidden border"
					style={{
						borderColor: "var(--color-border-subtle)",
						background: "var(--color-bg-elevated)",
					}}
				>
					<table className="w-full text-sm">
						<thead>
							<tr
								className="border-b"
								style={{
									borderColor: "var(--color-border-subtle)",
									background: "var(--color-bg-surface)",
								}}
							>
								<th
									className="text-left p-3 font-medium"
									style={{ color: "var(--color-text-muted)" }}
								>
									剧标题
								</th>
								<th
									className="text-left p-3 font-medium"
									style={{ color: "var(--color-text-muted)" }}
								>
									剧编号
								</th>
								<th
									className="text-left p-3 font-medium"
									style={{ color: "var(--color-text-muted)" }}
								>
									集数
								</th>
								<th
									className="text-left p-3 font-medium"
									style={{ color: "var(--color-text-muted)" }}
								>
									语言
								</th>
								<th
									className="text-left p-3 font-medium"
									style={{ color: "var(--color-text-muted)" }}
								>
									百度云链接
								</th>
								<th
									className="text-left p-3 font-medium"
									style={{ color: "var(--color-text-muted)" }}
								>
									状态
								</th>
							</tr>
						</thead>
						<tbody>
							{episodes.map((episode) => (
								<tr
									key={episode.id}
									className="border-b last:border-b-0"
									style={{ borderColor: "var(--color-border-subtle)" }}
								>
									<td className="p-3" style={{ color: "var(--color-text-primary)" }}>
										{episode.title}
									</td>
									<td
										className="p-3 font-mono text-xs"
										style={{ color: "var(--color-text-secondary)" }}
									>
										{episode.episode_no}
									</td>
									<td className="p-3" style={{ color: "var(--color-text-secondary)" }}>
										{episode.total_parts ?? "-"}
									</td>
									<td className="p-3" style={{ color: "var(--color-text-secondary)" }}>
										{episode.language ?? "-"}
									</td>
									<td
										className="p-3 max-w-[200px] truncate font-mono text-xs"
										style={{ color: "var(--color-text-muted)" }}
										title={episode.baidu_link}
									>
										{episode.baidu_link}
									</td>
									<td className="p-3">
										<span
											className="px-2 py-0.5 rounded text-xs font-medium"
											style={{
												background:
													(STATUS_COLORS[episode.status] || "var(--color-text-muted)") + "20",
												color: STATUS_COLORS[episode.status] || "var(--color-text-muted)",
											}}
										>
											{STATUS_LABELS[episode.status] || episode.status}
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
					{episodes.length === 0 && (
						<div className="text-center py-8" style={{ color: "var(--color-text-muted)" }}>
							暂无剧集
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function StatusCard({ label, value, color }: { label: string; value: number; color: string }) {
	return (
		<div className="text-center">
			<div className="text-2xl font-bold" style={{ color }}>
				{value}
			</div>
			<div
				className="text-xs mt-1"
				style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
			>
				{label}
			</div>
		</div>
	);
}
