import { useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark" | "auto";

function getSystemTheme(): "light" | "dark" {
	if (typeof window === "undefined") return "dark";
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
	const stored = localStorage.getItem("theme");
	if (stored === "light" || stored === "dark" || stored === "auto") return stored;
	return "auto";
}

function applyTheme(theme: Theme) {
	const resolved = theme === "auto" ? getSystemTheme() : theme;
	document.documentElement.setAttribute("data-theme", resolved);
}

export function useTheme() {
	const [theme, setThemeState] = useState<Theme>(getStoredTheme);

	useEffect(() => {
		applyTheme(theme);

		if (theme === "auto") {
			const mq = window.matchMedia("(prefers-color-scheme: dark)");
			const handler = () => applyTheme("auto");
			mq.addEventListener("change", handler);
			return () => mq.removeEventListener("change", handler);
		}
	}, [theme]);

	const setTheme = useCallback((t: Theme) => {
		localStorage.setItem("theme", t);
		setThemeState(t);
	}, []);

	const resolved = theme === "auto" ? getSystemTheme() : theme;

	return { theme, resolved, setTheme } as const;
}
