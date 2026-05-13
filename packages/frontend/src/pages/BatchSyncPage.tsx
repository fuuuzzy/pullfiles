import { useState, useEffect } from "react";

export function BatchSyncPage() {
	const [file, setFile] = useState<File | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [progressData, setProgressData] = useState<any>(null);
	const [tasks, setTasks] = useState<any[]>([]);
	const [isStarting, setIsStarting] = useState(false);

	useEffect(() => {
		const eventSource = new EventSource("/api/sync/progress");

		eventSource.onmessage = (e) => {
			try {
				const data = JSON.parse(e.data);
				setProgressData(data);
			} catch (err) {}
		};

		return () => {
			eventSource.close();
		};
	}, []);

	const fetchTasks = async () => {
		try {
			const res = await fetch("/api/sync/tasks");
			const json = await res.json();
			if (json.success) {
				setTasks(json.data);
			}
		} catch (error) {
			console.error("Fetch tasks failed", error);
		}
	};

	useEffect(() => {
		fetchTasks();
		const intervalId = setInterval(fetchTasks, 2000);
		return () => clearInterval(intervalId);
	}, []);

	const handleUpload = async () => {
		if (!file) return;
		setIsUploading(true);
		
		const formData = new FormData();
		formData.append("file", file);

		try {
			const res = await fetch("/api/sync/upload-excel", {
				method: "POST",
				body: formData,
			});
			const json = await res.json();
			if (json.success) {
				alert(`成功导入 ${json.data.insertedCount} 条记录`);
				setFile(null);
				fetchTasks();
			} else {
				alert(`导入失败: ${json.error}`);
			}
		} catch (error) {
			console.error(error);
			alert("上传发生异常");
		} finally {
			setIsUploading(false);
		}
	};

	const handleStartSync = async () => {
		setIsStarting(true);
		try {
			await fetch("/api/sync/start", { method: "POST" });
		} catch (error) {
			console.error(error);
		} finally {
			setIsStarting(false);
		}
	};

	const handleRetry = async (taskId: number) => {
		try {
			await fetch("/api/sync/retry", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ taskIds: [taskId] }),
			});
			fetchTasks();
		} catch (error) {
			console.error(error);
		}
	};

	return (
		<div className="p-6">
			<h1 className="text-xl font-bold mb-6" style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}>
				剧集批量同步
			</h1>

			{/* Upload Section */}
			<div className="card p-6 mb-6">
				<h2 className="text-lg mb-4" style={{ color: "var(--color-amber-300)" }}>导入 Excel 表格</h2>
				<div className="flex items-center gap-4">
					<input
						type="file"
						accept=".xlsx, .xls, .csv"
						onChange={(e) => setFile(e.target.files?.[0] || null)}
						className="block w-full text-sm"
						style={{ color: "var(--color-text-secondary)" }}
					/>
					<button
						className="btn-primary whitespace-nowrap"
						onClick={handleUpload}
						disabled={!file || isUploading}
					>
						{isUploading ? "正在导入..." : "确认导入"}
					</button>
				</div>
			</div>

			{/* Progress Section */}
			{progressData && progressData.total > 0 && (
				<div className="card p-6 mb-6">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg" style={{ color: "var(--color-amber-300)" }}>同步进度</h2>
						<button className="btn-secondary" onClick={handleStartSync} disabled={isStarting}>
							{isStarting ? "正在启动..." : "开始同步"}
						</button>
					</div>
					<div className="flex gap-8 mb-4">
						<div>总计: {progressData.total}</div>
						<div style={{ color: "var(--color-green-400)" }}>成功: {progressData.success}</div>
						<div style={{ color: "var(--color-red-400)" }}>失败: {progressData.failed}</div>
						<div style={{ color: "var(--color-amber-400)" }}>同步中: {progressData.syncing}</div>
						<div>排队中: {progressData.pending}</div>
					</div>
					<div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden border border-gray-700">
						<div
							className="h-full transition-all duration-300 relative"
							style={{ 
								width: `${progressData.percent}%`,
								background: "var(--color-amber-500)"
							}}
						>
							<div className="absolute inset-0 bg-white/20" style={{ backgroundImage: "linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)" }}></div>
						</div>
					</div>
					<div className="text-right text-xs mt-2 text-gray-500">{progressData.percent}%</div>
				</div>
			)}

			{/* Task List */}
			<div className="card p-6">
				<h2 className="text-lg mb-4" style={{ color: "var(--color-amber-300)" }}>任务列表</h2>
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm" style={{ color: "var(--color-text-secondary)" }}>
						<thead>
							<tr className="border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
								<th className="py-2">任务 ID</th>
								<th className="py-2">剧集标题</th>
								<th className="py-2">状态</th>
								<th className="py-2">更新时间</th>
								<th className="py-2">错误信息</th>
								<th className="py-2 text-right">操作</th>
							</tr>
						</thead>
						<tbody>
							{tasks.map((task) => (
								<tr key={task.task_id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
									<td className="py-2">{task.task_id}</td>
									<td className="py-2">{task.drama_title}</td>
									<td className="py-2">
										<span className={
											task.status === "success" ? "text-green-400" :
											task.status === "failed" ? "text-red-400" :
											task.status === "syncing" ? "text-amber-400" : ""
										}>
											{task.status}
										</span>
									</td>
									<td className="py-2">{new Date(task.updated_at).toLocaleString()}</td>
									<td className="py-2 text-red-400 text-xs max-w-xs truncate" title={task.error_message}>{task.error_message}</td>
									<td className="py-2 text-right">
										{task.status === "failed" && (
											<button className="text-amber-400 hover:underline text-xs" onClick={() => handleRetry(task.task_id)}>
												重试
											</button>
										)}
									</td>
								</tr>
							))}
							{tasks.length === 0 && (
								<tr>
									<td colSpan={6} className="py-8 text-center text-gray-500">
										暂无数据
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}