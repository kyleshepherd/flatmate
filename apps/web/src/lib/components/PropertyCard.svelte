<script lang="ts">
	import CommuteChips from "./CommuteChips.svelte";

	type CommuteEntry = {
		userId: string;
		userName: string;
		destinationLabel: string;
		mode: string;
		durationMins: number | null;
	};

	type Property = {
		searchPropertyId: string;
		propertyId: string;
		address: string;
		summary: string;
		bedrooms: number | null;
		bathrooms: number | null;
		priceMonthly: number;
		propertyType: string;
		availableDate: string | null;
		images: Array<{ url: string; caption: string | null }>;
		rightmoveUrl: string;
		listingStatus: string;
		status: string;
		shortlisted: boolean;
		commutes: CommuteEntry[];
	};

	let { property, searchId }: { property: Property; searchId: string } = $props();

	const statusConfig: Record<string, { label: string; color: string }> = {
		new: { label: "New", color: "rgb(125,211,252)" },
		interested: { label: "Interested", color: "rgb(252,211,77)" },
		viewing_booked: { label: "Viewing", color: "rgb(196,181,253)" },
		applied: { label: "Applied", color: "rgb(110,231,183)" },
		rejected: { label: "Rejected", color: "rgb(252,165,165)" },
		not_interested: { label: "Skipped", color: "rgb(161,161,170)" },
	};

	let imageUrl = $derived(
		(property.images?.[0]?.url ?? "").replace("_max_476x317", "_max_656x437"),
	);
	let status = $derived(statusConfig[property.status] ?? statusConfig.new);
</script>

<a
	href="/searches/{searchId}/properties/{property.propertyId}"
	style="display: flex; flex-direction: column; overflow: hidden; border-radius: 16px; background: var(--card); border: 1px solid rgba(255,255,255,0.08); transition: all 0.2s; text-decoration: none; color: inherit;"
	class="group hover:border-primary/30 hover:shadow-xl hover:shadow-primary/[0.04] hover:-translate-y-0.5"
>
	<!-- Image -->
	<div style="position: relative; height: 220px; overflow: hidden; background: #1a1a1a;">
		{#if imageUrl}
			<img
				src={imageUrl}
				alt={property.address}
				style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s;"
				class="group-hover:scale-105"
				loading="lazy"
			/>
		{:else}
			<div style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 2rem; opacity: 0.3;">&#127968;</div>
		{/if}

		<!-- Status badge -->
		<div style="position: absolute; top: 12px; left: 12px; z-index: 2; display: flex; gap: 6px;">
			<span style="border-radius: 6px; padding: 3px 10px; font-size: 11px; font-weight: 600; backdrop-filter: blur(8px); background: rgba(0,0,0,0.6); color: {status.color};">
				{status.label}
			</span>
			{#if property.listingStatus === "reduced"}
				<span style="border-radius: 6px; padding: 3px 10px; font-size: 11px; font-weight: 600; backdrop-filter: blur(8px); background: rgba(239,68,68,0.85); color: white;">
					Reduced
				</span>
			{/if}
		</div>

		{#if property.shortlisted}
			<div style="position: absolute; top: 12px; right: 12px; z-index: 2; font-size: 18px; color: rgb(251,191,36); filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));">&#9733;</div>
		{/if}
	</div>

	<!-- Content -->
	<div style="padding: 16px; display: flex; flex-direction: column; gap: 10px;">
		<!-- Price + Address row -->
		<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
			<div style="min-width: 0; flex: 1;">
				<h3 class="truncate text-sm font-semibold leading-tight transition-colors group-hover:text-primary">
					{property.address}
				</h3>
				<p style="margin-top: 2px; font-size: 12px; color: var(--muted-foreground);">{property.propertyType}</p>
			</div>
			<div style="flex-shrink: 0; text-align: right;">
				<span style="font-size: 18px; font-weight: 700; color: var(--primary);">£{property.priceMonthly.toLocaleString()}</span>
				<span style="display: block; font-size: 10px; color: var(--muted-foreground);">pcm</span>
			</div>
		</div>

		<!-- Details -->
		<div style="display: flex; gap: 8px; flex-wrap: wrap;">
			{#if property.bedrooms != null}
				<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; padding: 2px 8px; border-radius: 4px; background: var(--secondary); color: var(--muted-foreground); font-weight: 500;">
					<svg style="width: 14px; height: 14px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10c0 1.1.9 2 2 2h14a2 2 0 002-2V7M3 7h18M3 7l2-4h14l2 4M8 14h8" /></svg>
					{property.bedrooms} bed
				</span>
			{/if}
			{#if property.bathrooms != null}
				<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; padding: 2px 8px; border-radius: 4px; background: var(--secondary); color: var(--muted-foreground); font-weight: 500;">
					<svg style="width: 14px; height: 14px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 14h18v3a3 3 0 01-3 3H6a3 3 0 01-3-3v-3zM3 14V5a2 2 0 012-2h1a2 2 0 012 2v1" /></svg>
					{property.bathrooms} bath
				</span>
			{/if}
			<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; padding: 2px 8px; border-radius: 4px; background: var(--secondary); color: var(--muted-foreground); font-weight: 500;">
				<svg style="width: 14px; height: 14px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
				{property.availableDate ?? "Ask agent"}
			</span>
		</div>

		<!-- Commute chips -->
		{#if property.commutes.length > 0}
			<div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px;">
				<CommuteChips commutes={property.commutes} />
			</div>
		{/if}
	</div>
</a>
