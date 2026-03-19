import { rateLimiter } from "../rate-limit";

const rightmoveDelay = rateLimiter(1500);

interface SearchParams {
	locationIdentifier: string;
	radius: string;
	minPrice?: number | null;
	maxPrice?: number | null;
	minBedrooms?: number | null;
	maxBedrooms?: number | null;
	propertyType?: string | null;
	includeLetAgreed: boolean;
}

export function buildSearchUrl(params: SearchParams, index = 0): string {
	const url = new URL("https://www.rightmove.co.uk/property-to-rent/find.html");
	url.searchParams.set("locationIdentifier", params.locationIdentifier);
	url.searchParams.set("radius", params.radius);
	if (params.minPrice != null) url.searchParams.set("minPrice", String(params.minPrice));
	if (params.maxPrice != null) url.searchParams.set("maxPrice", String(params.maxPrice));
	if (params.minBedrooms != null) url.searchParams.set("minBedrooms", String(params.minBedrooms));
	if (params.maxBedrooms != null) url.searchParams.set("maxBedrooms", String(params.maxBedrooms));
	if (params.propertyType) url.searchParams.set("propertyTypes", params.propertyType);
	if (params.includeLetAgreed) {
		url.searchParams.set("letType", "with");
	} else {
		url.searchParams.set("_includeLetAgreed", "on");
	}
	if (index > 0) url.searchParams.set("index", String(index));
	return url.toString();
}

export async function fetchSearchPage(url: string): Promise<string> {
	await rightmoveDelay();
	const res = await fetch(url, {
		headers: {
			"User-Agent":
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
		},
	});
	if (!res.ok) {
		throw new Error(`Rightmove returned ${res.status} for ${url}`);
	}
	return res.text();
}
