import { rateLimiter } from "../rate-limit";

const tflDelay = rateLimiter(35); // ~30 req/s

export async function fetchTflTransitTime(
	fromLat: number,
	fromLng: number,
	toLat: number,
	toLng: number,
	apiKey: string,
): Promise<number | null> {
	await tflDelay();
	const from = `${fromLat},${fromLng}`;
	const to = `${toLat},${toLng}`;
	const params = new URLSearchParams({ mode: "tube,bus,overground,dlr" });
	if (apiKey) params.set("app_key", apiKey);

	const url = `https://api.tfl.gov.uk/Journey/JourneyResults/${from}/to/${to}?${params}`;
	const res = await fetch(url);
	if (!res.ok) {
		console.warn(`TfL API returned ${res.status} for ${url}`);
		return null;
	}

	const data = await res.json();
	if (data.journeys?.length > 0) {
		return Math.min(...data.journeys.map((j: { duration: number }) => j.duration));
	}
	return null;
}
