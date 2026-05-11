import { useState } from "react";
import { login } from "../api/client.js";

interface LoginProps {
	onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			await login(password);
			onLogin();
		} catch (err) {
			setError(err instanceof Error ? err.message : "登录失败");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			className="min-h-screen flex items-center justify-center noise-bg"
			style={{ background: "var(--color-bg-primary)" }}
		>
			<div className="w-full max-w-md px-8">
				{/* Logo area */}
				<div className="text-center mb-12">
					<div className="inline-flex items-center gap-3 mb-4">
						<div
							className="w-3 h-3 rounded-full"
							style={{
								background: "var(--color-amber-500)",
								boxShadow: "0 0 12px var(--color-amber-glow-strong)",
							}}
						/>
						<span
							className="text-xs tracking-[0.3em] uppercase"
							style={{ color: "var(--color-amber-400)", fontFamily: "var(--font-display)" }}
						>
							媒体传输控制台
						</span>
						<div
							className="w-3 h-3 rounded-full"
							style={{
								background: "var(--color-amber-500)",
								boxShadow: "0 0 12px var(--color-amber-glow-strong)",
							}}
						/>
					</div>
					<h1
						className="text-2xl font-bold tracking-wide"
						style={{ color: "var(--color-text-primary)" }}
					>
						系统登录
					</h1>
				</div>

				<form onSubmit={handleSubmit} className="space-y-6">
					<div className="relative">
						<label
							htmlFor="password"
							className="block text-[10px] tracking-[0.2em] uppercase mb-3"
							style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
						>
							访问密码
						</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="请输入访问密码"
							className="w-full px-4 py-3.5 rounded-lg text-sm outline-none transition-all duration-200"
							style={{
								background: "var(--color-bg-elevated)",
								border: "1px solid var(--color-border-default)",
								color: "var(--color-text-primary)",
								fontFamily: "var(--font-mono)",
							}}
							onFocus={(e) => {
								e.currentTarget.style.borderColor = "var(--color-amber-500)";
								e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-amber-glow)";
							}}
							onBlur={(e) => {
								e.currentTarget.style.borderColor = "var(--color-border-default)";
								e.currentTarget.style.boxShadow = "none";
							}}
						/>
					</div>

					{error && (
						<div
							className="text-xs tracking-wider text-center py-2 rounded"
							style={{
								color: "var(--color-status-failed)",
								background: "rgba(239, 68, 68, 0.08)",
								fontFamily: "var(--font-mono)",
							}}
						>
							{error}
						</div>
					)}

					<button
						type="submit"
						disabled={loading || !password}
						className="w-full py-3.5 rounded-lg text-sm font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
						style={{
							background: loading ? "var(--color-bg-surface)" : "var(--color-amber-600)",
							color: loading ? "var(--color-text-muted)" : "#000",
							border: "none",
						}}
					>
						{loading ? "验证中..." : "连接系统"}
					</button>
				</form>

				{/* Status indicator */}
				<div className="mt-10 flex items-center justify-center gap-2">
					<div
						className="w-1.5 h-1.5 rounded-full"
						style={{
							background: error ? "var(--color-status-failed)" : "var(--color-status-pending)",
						}}
					/>
					<span
						className="text-[10px] tracking-[0.15em] uppercase"
						style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
					>
						{error ? "离线" : "待命"}
					</span>
				</div>
			</div>
		</div>
	);
}