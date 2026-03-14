import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

function tokenize(query: string): string {
	const upper = query.replace(/\s/g, "").toUpperCase();
	let result = "";
	for (let i = 0; i < upper.length; i++) {
		result += upper[i];
		if ((i + 1) % 2 === 0) result += "/";
	}
	if (!result.endsWith("/")) result += "/";
	return result;
}

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get("q")?.trim() ?? "";
	if (q.length < 2) return json([]);

	try {
		const tokenized = tokenize(q);
		const res = await fetch(
			`https://www.rightmove.co.uk/typeAhead/uknostreet/${tokenized}`,
			{
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
				},
			},
		);

		if (!res.ok) return json([]);

		const data = await res.json();
		const locations = (data.typeAheadLocations ?? []).map(
			(loc: { displayName: string; locationIdentifier: string }) => ({
				displayName: loc.displayName,
				locationIdentifier: loc.locationIdentifier,
			}),
		);

		return json(locations);
	} catch {
		return json([]);
	}
};
