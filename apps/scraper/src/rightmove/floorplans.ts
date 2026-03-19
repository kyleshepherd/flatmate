import { fetchSearchPage } from "./search";

export async function fetchFloorplanUrls(rightmoveUrl: string): Promise<string[]> {
	const html = await fetchSearchPage(rightmoveUrl);
	const floorplanUrls: string[] = [];

	const match = html.match(
		/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
	);
	if (match) {
		const data = JSON.parse(match[1]);
		const floorplans = data?.props?.pageProps?.propertyData?.floorplans ?? [];
		for (const fp of floorplans) {
			if (fp.url) {
				floorplanUrls.push(fp.url);
			}
		}
	}

	// Fallback: look for floorplan images in HTML
	if (floorplanUrls.length === 0) {
		const imgMatches = html.matchAll(
			/src="(https:\/\/media\.rightmove\.co\.uk[^"]*floorplan[^"]*)"/gi,
		);
		for (const m of imgMatches) {
			floorplanUrls.push(m[1]);
		}
	}

	return floorplanUrls;
}
