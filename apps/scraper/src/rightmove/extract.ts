export interface RawRightmoveProperty {
	id: number;
	bedrooms: number;
	bathrooms: number;
	summary: string;
	displayAddress: string;
	location: { latitude: number; longitude: number };
	images: Array<{ srcUrl: string; caption: string | null }>;
	propertySubType: string;
	letAvailableDate: string | null;
	listingUpdate: { listingUpdateReason: string; listingUpdateDate: string };
	price: { amount: number; frequency: string };
	customer: {
		brandTradingName: string;
		branchName: string;
		contactTelephone: string;
	};
	propertyUrl: string;
	keyFeatures: Array<{ description: string }>;
	numberOfFloorplans: number;
}

export interface ExtractedProperty {
	rightmoveId: number;
	address: string;
	summary: string;
	bedrooms: number;
	bathrooms: number;
	priceMonthly: number;
	propertyType: string;
	latitude: string;
	longitude: string;
	availableDate: string | null;
	images: Array<{ url: string; caption: string | null }>;
	keyFeatures: string[];
	agentName: string;
	agentPhone: string | null;
	rightmoveUrl: string;
	listingStatus: string;
	numberOfFloorplans: number;
}

export interface ExtractionResult {
	properties: ExtractedProperty[];
	pagination: { total: number; next: string | null };
}

export function extractProperties(html: string): ExtractionResult {
	const match = html.match(
		/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
	);
	if (!match) {
		throw new Error("Could not find __NEXT_DATA__ in page HTML");
	}

	const data = JSON.parse(match[1]);
	const searchResults = data?.props?.pageProps?.searchResults;
	const rawProperties: RawRightmoveProperty[] = searchResults?.properties ?? [];
	const pagination = searchResults?.pagination ?? {};

	const properties = rawProperties.map((p) => ({
		rightmoveId: p.id,
		address: p.displayAddress,
		summary: p.summary,
		bedrooms: p.bedrooms,
		bathrooms: p.bathrooms,
		priceMonthly: p.price.amount,
		propertyType: p.propertySubType,
		latitude: String(p.location.latitude),
		longitude: String(p.location.longitude),
		availableDate: p.letAvailableDate ? p.letAvailableDate.split("T")[0] : null,
		images: p.images.map((img) => ({ url: img.srcUrl, caption: img.caption })),
		keyFeatures: p.keyFeatures.map((f) => f.description),
		agentName: `${p.customer.brandTradingName}, ${p.customer.branchName}`,
		agentPhone: p.customer.contactTelephone || null,
		rightmoveUrl: `https://www.rightmove.co.uk${p.propertyUrl}`,
		listingStatus:
			p.listingUpdate.listingUpdateReason === "new"
				? "new"
				: p.listingUpdate.listingUpdateReason === "reduced"
					? "reduced"
					: "listed",
		numberOfFloorplans: p.numberOfFloorplans,
	}));

	return {
		properties,
		pagination: {
			total: pagination.total ?? 0,
			next: pagination.next ?? null,
		},
	};
}
