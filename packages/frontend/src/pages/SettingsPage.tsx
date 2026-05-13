import type { CompressSettings } from "@ls-pull-video/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "../api/client.js";

const RESOLUTIONS = [
	"540x960",
	"720x1280",
	"828x1472",
	"1080x1920",
	"1440x2560",
	"2160x3840",
];

const PRESETS = [
	"ultrafast",
	"superfast",
	"fast",
	"medium",
	"slow",
	"slower",
	"veryslow",
];

const AUDIO_BITRATES = ["64k", "96k", "128k", "192k", "256k"];

export function SettingsPage() {
	const queryClient = useQueryClient();

	const { data: settings, isLoading } = useQuery({
		queryKey: ["compress-settings"],
		queryFn: () => apiFetch<CompressSettings>("/api/compress-settings"),
	});

	const [form, setForm] = useState<Partial<CompressSettings>>({});

	const updateMutation = useMutation({
		mutationFn: (updates: Partial<CompressSettings>) =>
			apiFetch<CompressSettings>("/api/compress-settings", {
				method: "PUT",
				body: JSON.stringify(updates),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["compress-settings"] });
			setForm({});
		},
	});

	const current = { ...settings, ...form };

	const handleChange = <K extends keyof CompressSettings>(
		key: K,
		value: CompressSettings[K],
	) => {
		setForm((prev) => ({ ...prev, [key]: value }));
	};

	const handleSave = () => {
		if (Object.keys(form).length > 0) {
			updateMutation.mutate(form);
		}
	};

	const hasChanges = Object.keys(form).length > 0;

	if (isLoading) {
		return (
			<div className="p-6 md:p-8">
				<p style={{ color: "var(--color-text-muted)" }}>加载中...</p>
			</div>
		);
	}

	return (
		<div className="p-6 md:p-8 space-y-6">
			<div>
				<h1
					className="text-xl font-bold tracking-wide"
					style={{ color: "var(--color-text-primary)" }}
				>
					压缩设置
				</h1>
				<p
					className="text-xs mt-1 tracking-wider"
					style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
				>
					视频上传前的 FFmpeg 压缩参数配置
				</p>
			</div>

			<div className="card-cyber p-6 space-y-6">
				{/* Enabled toggle */}
				<div className="flex items-center justify-between">
					<div>
						<label
							className="text-sm font-bold"
							style={{ color: "var(--color-text-primary)" }}
						>
							启用压缩
						</label>
						<p
							className="text-xs mt-0.5"
							style={{ color: "var(--color-text-muted)" }}
						>
							上传 R2 前使用 FFmpeg 压缩视频
						</p>
					</div>
					<button
						type="button"
						onClick={() => handleChange("enabled", !current.enabled)}
						className="relative w-12 h-6 rounded-full transition-colors duration-200 cursor-pointer"
						style={{
							background: current.enabled
								? "var(--color-amber-500)"
								: "var(--color-bg-hover)",
						}}
					>
						<div
							className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200"
							style={{
								transform: current.enabled
									? "translateX(26px)"
									: "translateX(2px)",
							}}
						/>
					</button>
				</div>

				{/* Numeric fields */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<NumberField
						label="跳过阈值 (MB)"
						description="文件小于此值不压缩"
						value={current.skip_threshold_mb ?? 60}
						min={1}
						max={500}
						onChange={(v) => handleChange("skip_threshold_mb", v)}
					/>
					<NumberField
						label="目标大小 (MB)"
						description="压缩后的目标文件大小"
						value={current.target_size_mb ?? 50}
						min={1}
						max={2000}
						onChange={(v) => handleChange("target_size_mb", v)}
					/>
					<NumberField
						label="CRF 画质值"
						description="18-51，越小画质越好"
						value={current.crf ?? 28}
						min={18}
						max={51}
						onChange={(v) => handleChange("crf", v)}
					/>
					<NumberField
						label="帧率 (fps)"
						description="输出视频帧率"
						value={current.fps ?? 30}
						min={24}
						max={60}
						onChange={(v) => handleChange("fps", v)}
					/>
				</div>

				{/* Select fields */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<SelectField
						label="输出分辨率"
						description="强制缩放到指定分辨率"
						value={current.resolution ?? "1080x1920"}
						options={RESOLUTIONS}
						onChange={(v) => handleChange("resolution", v)}
					/>
					<SelectField
						label="编码速度"
						description="越快压缩率越低"
						value={current.preset ?? "fast"}
						options={PRESETS}
						onChange={(v) => handleChange("preset", v)}
					/>
					<SelectField
						label="音频比特率"
						description="音频编码码率"
						value={current.audio_bitrate ?? "128k"}
						options={AUDIO_BITRATES}
						onChange={(v) => handleChange("audio_bitrate", v)}
					/>
					<SelectField
						label="CPU 线程限制"
						description="0 = 自动"
						value={String(current.threads ?? 0)}
						options={["0", "1", "2", "4", "6", "8", "12", "16"]}
						onChange={(v) => handleChange("threads", Number(v))}
					/>
				</div>

				{/* Save button */}
				<div className="flex items-center gap-4 pt-2">
					<button
						type="button"
						onClick={handleSave}
						disabled={!hasChanges || updateMutation.isPending}
						className="px-6 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
						style={{
							background: hasChanges
								? "var(--color-amber-500)"
								: "var(--color-bg-hover)",
							color: hasChanges ? "#000" : "var(--color-text-muted)",
							fontFamily: "var(--font-mono)",
						}}
					>
						{updateMutation.isPending ? "保存中..." : "保存设置"}
					</button>
					{updateMutation.isSuccess && (
						<span
							className="text-xs"
							style={{ color: "var(--color-amber-400)" }}
						>
							已保存
						</span>
					)}
					{updateMutation.isError && (
						<span className="text-xs text-red-400">
							保存失败: {updateMutation.error?.message}
						</span>
					)}
				</div>
			</div>
		</div>
	);
}

function NumberField({
	label,
	description,
	value,
	min,
	max,
	onChange,
}: {
	label: string;
	description: string;
	value: number;
	min: number;
	max: number;
	onChange: (v: number) => void;
}) {
	return (
		<div>
			<label className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
				{label}
			</label>
			<p className="text-xs mt-0.5 mb-2" style={{ color: "var(--color-text-muted)" }}>
				{description}
			</p>
			<input
				type="number"
				value={value}
				min={min}
				max={max}
				onChange={(e) => onChange(Number(e.target.value))}
				className="w-full px-3 py-2 rounded-md text-sm border outline-none transition-colors"
				style={{
					background: "var(--color-bg-primary)",
					borderColor: "var(--color-border-subtle)",
					color: "var(--color-text-primary)",
				}}
			/>
		</div>
	);
}

function SelectField({
	label,
	description,
	value,
	options,
	onChange,
}: {
	label: string;
	description: string;
	value: string;
	options: string[];
	onChange: (v: string) => void;
}) {
	return (
		<div>
			<label className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
				{label}
			</label>
			<p className="text-xs mt-0.5 mb-2" style={{ color: "var(--color-text-muted)" }}>
				{description}
			</p>
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="w-full px-3 py-2 rounded-md text-sm border outline-none transition-colors cursor-pointer"
				style={{
					background: "var(--color-bg-primary)",
					borderColor: "var(--color-border-subtle)",
					color: "var(--color-text-primary)",
				}}
			>
				{options.map((opt) => (
					<option key={opt} value={opt}>
						{opt}
					</option>
				))}
			</select>
		</div>
	);
}
