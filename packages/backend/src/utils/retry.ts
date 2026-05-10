import { MAX_RETRIES, RETRY_BASE_DELAY_MS } from "@ls-pull-video/shared";

export interface RetryOptions {
	maxRetries?: number;
	baseDelay?: number;
	onRetry?: (attempt: number, error: Error) => void;
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
	const { maxRetries = MAX_RETRIES, baseDelay = RETRY_BASE_DELAY_MS, onRetry } = options;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));

			if (attempt === maxRetries) {
				throw err;
			}

			if (onRetry) {
				onRetry(attempt + 1, err);
			}

			const jitter = Math.random() * 500;
			const delay = baseDelay * 2 ** attempt + jitter;
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw new Error("Unreachable");
}
