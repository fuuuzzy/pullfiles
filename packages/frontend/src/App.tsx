import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { checkAuth } from "./api/client.js";
import { Layout } from "./components/Layout.js";
import { Login } from "./components/Login.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { EpisodesPage } from "./pages/EpisodesPage.js";
import { LogsPage } from "./pages/LogsPage.js";
import { ProjectDetailPage } from "./pages/ProjectDetailPage.js";
import { ProjectsPage } from "./pages/ProjectsPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";
import { TransferPage } from "./pages/TransferPage.js";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 3000,
			retry: 1,
		},
	},
});

export function App() {
	const [authenticated, setAuthenticated] = useState(false);
	const [checking, setChecking] = useState(true);

	useEffect(() => {
		checkAuth().then((isAuth) => {
			setAuthenticated(isAuth);
			setChecking(false);
		});
	}, []);

	if (checking) {
		return (
			<div
				className="h-screen flex items-center justify-center"
				style={{ background: "var(--color-bg-primary)" }}
			>
				<div className="flex items-center gap-3">
					<div
						className="w-2 h-2 rounded-full animate-pulse-glow"
						style={{ background: "var(--color-amber-500)" }}
					/>
					<span
						className="text-[10px] tracking-[0.2em] uppercase"
						style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
					>
						正在初始化...
					</span>
				</div>
			</div>
		);
	}

	if (!authenticated) {
		return (
			<QueryClientProvider client={queryClient}>
				<Login onLogin={() => setAuthenticated(true)} />
			</QueryClientProvider>
		);
	}

	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<Layout>
					<Routes>
						<Route path="/" element={<DashboardPage />} />
						<Route path="/projects" element={<ProjectsPage />} />
						<Route path="/projects/:id" element={<ProjectDetailPage />} />
						<Route path="/episodes" element={<EpisodesPage />} />
						<Route path="/transfer" element={<TransferPage />} />
						<Route path="/logs" element={<LogsPage />} />
						<Route path="/settings" element={<SettingsPage />} />
						<Route path="*" element={<Navigate to="/" replace />} />
					</Routes>
				</Layout>
			</BrowserRouter>
		</QueryClientProvider>
	);
}
