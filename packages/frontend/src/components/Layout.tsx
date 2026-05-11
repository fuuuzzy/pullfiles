import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { clearAuthToken, logout } from "../api/client.js";
import { useTheme } from "../hooks/useTheme.js";

const IconDashboard = () => (
	<svg
		className="w-4 h-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="square"
		strokeLinejoin="miter"
	>
		<rect x="3" y="3" width="7" height="7" />
		<rect x="14" y="3" width="7" height="7" />
		<rect x="14" y="14" width="7" height="7" />
		<path d="M3 14h7v7H3z" />
	</svg>
);

const IconEpisodes = () => (
	<svg
		className="w-4 h-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="square"
		strokeLinejoin="miter"
	>
		<rect x="3" y="4" width="18" height="4" />
		<rect x="3" y="10" width="18" height="4" />
		<rect x="3" y="16" width="18" height="4" />
		<path d="M7 6h.01M7 12h.01M7 18h.01" />
	</svg>
);

const IconProjects = () => (
	<svg
		className="w-4 h-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="square"
		strokeLinejoin="miter"
	>
		<path d="M3 7v14h18V7" />
		<path d="M21 7H3l3-4h12l3 4z" />
		<path d="M12 11v6M9 14h6" />
	</svg>
);

const IconTransfer = () => (
	<svg
		className="w-4 h-4"
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
);

const IconLogs = () => (
	<svg
		className="w-4 h-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="square"
		strokeLinejoin="miter"
	>
		<path d="M4 17l6-6-6-6" />
		<path d="M12 19h8" />
	</svg>
);

const IconSun = () => (
	<svg
		className="w-4 h-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="square"
		strokeLinejoin="miter"
	>
		<circle cx="12" cy="12" r="4" />
		<path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
	</svg>
);

const IconSystem = () => (
	<svg
		className="w-4 h-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="square"
		strokeLinejoin="miter"
	>
		<rect x="2" y="4" width="20" height="12" />
		<path d="M8 20h8m-4-4v4" />
	</svg>
);

const IconMoon = () => (
	<svg
		className="w-4 h-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="square"
		strokeLinejoin="miter"
	>
		<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
	</svg>
);

const navItems = [
	{ to: "/", label: "仪表盘", icon: <IconDashboard /> },
	{ to: "/projects", label: "导入项目", icon: <IconProjects /> },
	{ to: "/episodes", label: "剧集管理", icon: <IconEpisodes /> },
	{ to: "/transfer", label: "传输任务", icon: <IconTransfer /> },
	{ to: "/logs", label: "API 日志", icon: <IconLogs /> },
];

const themeOptions = [
	{ value: "light" as const, icon: <IconSun />, title: "浅色模式" },
	{ value: "auto" as const, icon: <IconSystem />, title: "跟随系统" },
	{ value: "dark" as const, icon: <IconMoon />, title: "深色模式" },
];

export function Layout({ children }: { children: ReactNode }) {
	const { theme, setTheme } = useTheme();

	return (
		<div className="h-screen flex cyber-bg noise-bg">
			{/* Sidebar */}
			<aside
				className="w-56 flex-shrink-0 flex flex-col border-r"
				style={{
					borderColor: "var(--color-border-subtle)",
					background: "var(--color-bg-secondary)",
				}}
			>
				{/* Brand */}
				<div className="px-5 py-5 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
					<div className="flex items-center gap-2.5">
						<div
							className="w-2.5 h-2.5 rounded-full animate-pulse-glow"
							style={{ background: "var(--color-amber-500)" }}
						/>
						<span
							className="text-[10px] tracking-[0.25em] uppercase font-bold"
							style={{ color: "var(--color-amber-400)", fontFamily: "var(--font-display)" }}
						>
							媒体传输控制台
						</span>
					</div>
				</div>

				{/* Nav */}
				<nav className="flex-1 py-4 px-3 space-y-1">
					{navItems.map((item) => (
						<NavLink
							key={item.to}
							to={item.to}
							end={item.to === "/"}
							className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150"
							style={({ isActive }) => ({
								background: isActive ? "var(--color-amber-glow)" : "transparent",
								color: isActive ? "var(--color-amber-300)" : "var(--color-text-secondary)",
								borderLeft: isActive ? "2px solid var(--color-amber-500)" : "2px solid transparent",
							})}
						>
							<span className="flex items-center justify-center w-5 h-5">{item.icon}</span>
							<span style={{ fontFamily: "var(--font-display)" }}>{item.label}</span>
						</NavLink>
					))}
				</nav>

				{/* Theme toggle */}
				<div
					className="px-5 py-3 border-t flex items-center gap-1"
					style={{ borderColor: "var(--color-border-subtle)" }}
				>
					{themeOptions.map((opt) => (
						<button
							key={opt.value}
							onClick={() => setTheme(opt.value)}
							className={`theme-toggle-btn ${theme === opt.value ? "active" : ""}`}
							title={opt.title}
						>
							<span className="flex items-center justify-center w-5 h-5">{opt.icon}</span>
						</button>
					))}
				</div>

				{/* Footer */}
				<div className="px-5 py-4 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
					<button
						onClick={async () => {
							await logout();
							clearAuthToken();
							window.location.reload();
						}}
						className="text-[10px] tracking-[0.15em] uppercase cursor-pointer bg-transparent border-none"
						style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
					>
						<span className="flex items-center gap-1.5">
							断开连接
							<svg
								className="w-3 h-3"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="square"
								strokeLinejoin="miter"
							>
								<path d="M5 12h14M12 5l7 7-7 7" />
							</svg>
						</span>
					</button>
				</div>
			</aside>

			{/* Main */}
			<main className="flex-1 overflow-auto">{children}</main>
		</div>
	);
}
