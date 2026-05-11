import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
	useDeleteProject,
	useImportProject,
	useProjectStatus,
	useProjects,
	useStartSync,
} from "../hooks/useProjects.js";

const STATUS_COLORS: Record<string, string> = {
	created: "var(--color-text-muted)",
	parsing: "var(--color-amber-500)",
	syncing: "var(--color-blue-500)",
	completed: "var(--color-green-500)",
	failed: "var(--color-red-500)",
};

const STATUS_LABELS: Record<string, string> = {
	created: "待处理",
	parsing: "解析中",
	syncing: "同步中",
	completed: "已完成",
	failed: "失败",
};

export function ProjectsPage() {
	const navigate = useNavigate();
	const [showUpload, setShowUpload] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const { data: projects = [], isLoading } = useProjects();
	const importMutation = useImportProject();
	const startSyncMutation = useStartSync();
	const deleteMutation = useDeleteProject();

	const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			const result = await importMutation.mutateAsync(file);
			setShowUpload(false);
			navigate(`/projects/${result.projectId}`);
		} catch (err) {
			alert(err instanceof Error ? err.message : "导入失败");
		}

		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleStartSync = async (projectId: number) => {
		try {
			await startSyncMutation.mutateAsync(projectId);
		} catch (err) {
			alert(err instanceof Error ? err.message : "启动同步失败");
		}
	};

	const handleDelete = async (projectId: number) => {
		if (!confirm("确定要删除这个项目吗？")) return;
		try {
			await deleteMutation.mutateAsync(projectId);
		} catch (err) {
			alert(err instanceof Error ? err.message : "删除失败");
		}
	};

	return (
		<div className="p-6 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1
						className="text-xl font-bold tracking-wide"
						style={{ color: "var(--color-text-primary)" }}
					>
						导入项目
					</h1>
					<p
						className="text-xs mt-1"
						style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
					>
						通过Excel导入剧集信息并同步到云端
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowUpload(!showUpload)}
					className="px-5 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer"
					style={{
						background: "var(--color-amber-500)",
						color: "#000",
						fontFamily: "var(--font-mono)",
					}}
				>
					{showUpload ? "取消" : "导入Excel"}
				</button>
			</div>

			{showUpload && (
				<div
					className="rounded-xl p-8 border text-center"
					style={{
						borderColor: "var(--color-border-subtle)",
						background: "var(--color-bg-elevated)",
					}}
				>
					<input
						ref={fileInputRef}
						type="file"
						accept=".xlsx,.xls"
						onChange={handleImport}
						className="hidden"
					/>
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						disabled={importMutation.isPending}
						className="px-6 py-3 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
						style={{
							background: "var(--color-bg-surface)",
							color: "var(--color-text-primary)",
							border: "1px solid var(--color-border-default)",
							fontFamily: "var(--font-mono)",
						}}
					>
						{importMutation.isPending ? "导入中..." : "选择Excel文件"}
					</button>
					<p
						className="text-xs mt-3"
						style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
					>
						支持 .xlsx, .xls 格式
					</p>
				</div>
			)}

			{isLoading ? (
				<div className="text-center py-12">
					<span style={{ color: "var(--color-text-muted)" }}>加载中...</span>
				</div>
			) : projects.length === 0 ? (
				<div
					className="rounded-xl p-12 text-center border"
					style={{
						borderColor: "var(--color-border-subtle)",
						background: "var(--color-bg-elevated)",
					}}
				>
					<svg
						className="w-12 h-12 mx-auto mb-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						style={{ color: "var(--color-text-muted)" }}
					>
						<path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
					</svg>
					<p style={{ color: "var(--color-text-muted)" }}>暂无项目</p>
					<p
						className="text-xs mt-1"
						style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
					>
						点击上方按钮导入Excel文件
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{projects.map((project) => (
						<ProjectCard
							key={project.id}
							project={project}
							onView={() => navigate(`/projects/${project.id}`)}
							onStartSync={() => handleStartSync(project.id)}
							onDelete={() => handleDelete(project.id)}
							isSyncing={startSyncMutation.isPending}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function ProjectCard({
	project,
	onView,
	onStartSync,
	onDelete,
	isSyncing,
}: {
	project: { id: number; name: string; status: string; total_episodes: number; completed_episodes: number; created_at: string };
	onView: () => void;
	onStartSync: () => void;
	onDelete: () => void;
	isSyncing: boolean;
}) {
	const { data: status } = useProjectStatus(project.id);

	return (
		<div
			className="rounded-xl p-4 border transition-all duration-200"
			style={{
				borderColor: "var(--color-border-subtle)",
				background: "var(--color-bg-elevated)",
			}}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<button
						type="button"
						onClick={onView}
						className="text-left cursor-pointer"
						style={{ color: "var(--color-text-primary)" }}
					>
						<h3 className="font-medium">{project.name}</h3>
						<p
							className="text-xs mt-0.5"
							style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
						>
							{new Date(project.created_at).toLocaleString()} · {project.total_episodes}部剧
						</p>
					</button>
					<span
						className="px-2 py-0.5 rounded text-xs font-medium"
						style={{
							background: STATUS_COLORS[project.status] + "20",
							color: STATUS_COLORS[project.status],
						}}
					>
						{STATUS_LABELS[project.status] || project.status}
					</span>
				</div>

				<div className="flex items-center gap-2">
					{status && (
						<span
							className="text-xs"
							style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
						>
							{status.saved}/{status.total}
						</span>
					)}

					{project.status === "created" || project.status === "failed" ? (
						<button
							type="button"
							onClick={onStartSync}
							disabled={isSyncing}
							className="px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
							style={{
								background: isSyncing ? "var(--color-bg-surface)" : "var(--color-amber-500)",
								color: isSyncing ? "var(--color-text-muted)" : "#000",
								fontFamily: "var(--font-mono)",
							}}
						>
							{isSyncing ? "同步中..." : "开始同步"}
						</button>
					) : (
						<button
							type="button"
							onClick={onView}
							className="px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer"
							style={{
								background: "var(--color-bg-surface)",
								color: "var(--color-text-primary)",
								border: "1px solid var(--color-border-default)",
								fontFamily: "var(--font-mono)",
							}}
						>
							查看详情
						</button>
					)}

					<button
						type="button"
						onClick={onDelete}
						className="px-3 py-2 rounded-lg text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer"
						style={{
							background: "var(--color-bg-surface)",
							color: "var(--color-status-failed)",
							border: "1px solid rgba(239, 68, 68, 0.2)",
							fontFamily: "var(--font-mono)",
						}}
						title="删除"
					>
						删除
					</button>
				</div>
			</div>

			{status && (status.downloading > 0 || status.saved > 0 || status.failed > 0) && (
				<div className="mt-3 flex items-center gap-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
					{status.pending > 0 && <span>待处理: {status.pending}</span>}
					{status.downloading > 0 && <span style={{ color: "var(--color-amber-500)" }}>下载中: {status.downloading}</span>}
					{status.uploaded > 0 && <span style={{ color: "var(--color-blue-500)" }}>已上传: {status.uploaded}</span>}
					{status.saved > 0 && <span style={{ color: "var(--color-green-500)" }}>已保存: {status.saved}</span>}
					{status.failed > 0 && <span style={{ color: "var(--color-red-500)" }}>失败: {status.failed}</span>}
				</div>
			)}
		</div>
	);
}