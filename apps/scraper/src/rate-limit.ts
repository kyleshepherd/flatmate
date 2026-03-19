export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function rateLimiter(minDelayMs: number) {
	let lastCall = 0;
	return async () => {
		const now = Date.now();
		const elapsed = now - lastCall;
		if (elapsed < minDelayMs) {
			await delay(minDelayMs - elapsed);
		}
		lastCall = Date.now();
	};
}
