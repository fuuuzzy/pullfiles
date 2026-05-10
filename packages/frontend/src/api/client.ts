import type { ApiResponse } from "@ls-pull-video/shared";

let authToken: string | null = null;

export function setAuthToken(token: string): void {
	authToken = token;
	localStorage.setItem("auth_token", token);
}

export function getAuthToken(): string | null {
	if (!authToken) {
		authToken = localStorage.getItem("auth_token");
	}
	return authToken;
}

export function clearAuthToken(): void {
	authToken = null;
	localStorage.removeItem("auth_token");
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
	const token = getAuthToken();
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...((options.headers as Record<string, string>) ?? {}),
	};

	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	const res = await fetch(path, { ...options, headers });

	if (res.status === 401) {
		clearAuthToken();
		window.location.reload();
		throw new Error("Unauthorized");
	}

	const data = (await res.json()) as ApiResponse<T>;

	if (!data.success) {
		throw new Error(data.error ?? "Unknown error");
	}

	return data.data as T;
}
