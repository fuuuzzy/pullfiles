import type { ApiResponse } from "@ls-pull-video/shared";

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...((options.headers as Record<string, string>) ?? {}),
	};

	const res = await fetch(path, { ...options, headers });

	if (res.status === 401) {
		window.location.reload();
		throw new Error("Unauthorized");
	}

	const data = (await res.json()) as ApiResponse<T>;

	if (!data.success) {
		throw new Error(data.error ?? "Unknown error");
	}

	return data.data as T;
}

export async function checkAuth(): Promise<boolean> {
	try {
		const res = await fetch("/api/auth/check");
		const data = (await res.json()) as ApiResponse<{ authenticated: boolean }>;
		return data.data?.authenticated ?? false;
	} catch {
		return false;
	}
}

export async function login(password: string): Promise<void> {
	const res = await fetch("/api/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ password }),
	});

	const data = (await res.json()) as ApiResponse<unknown>;

	if (!data.success) {
		throw new Error(data.error ?? "Login failed");
	}
}

export async function logout(): Promise<void> {
	await fetch("/api/auth/logout", { method: "POST" });
}

export function clearAuthToken(): void {
	localStorage.removeItem("auth_token");
}
