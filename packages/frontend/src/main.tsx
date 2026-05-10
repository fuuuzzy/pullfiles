import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./styles/globals.css";

// Apply theme before first paint to prevent flash
function initTheme() {
	const stored = localStorage.getItem("theme") ?? "auto";
	const resolved =
		stored === "auto" || !stored
			? window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light"
			: stored;
	document.documentElement.setAttribute("data-theme", resolved);
}
initTheme();

const rootEl = document.getElementById("root");
if (rootEl) {
	createRoot(rootEl).render(
		<StrictMode>
			<App />
		</StrictMode>,
	);
}
