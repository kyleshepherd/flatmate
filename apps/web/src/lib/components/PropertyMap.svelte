<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";

	type MapProperty = {
		propertyId: string;
		address: string;
		priceMonthly: number;
		latitude: string;
		longitude: string;
		bedrooms: number | null;
		status: string;
	};

	let { properties, searchId }: { properties: MapProperty[]; searchId: string } = $props();

	let mapContainer: HTMLDivElement;
	let map: L.Map | undefined;

	onMount(async () => {
		const L = await import("leaflet");

		// Import leaflet CSS
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
		document.head.appendChild(link);

		// Wait for CSS to load
		await new Promise((resolve) => {
			link.onload = resolve;
			setTimeout(resolve, 1000);
		});

		if (!mapContainer) return;

		map = L.map(mapContainer, { zoomControl: true });

		L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
			maxZoom: 19,
		}).addTo(map);

		const bounds: L.LatLngExpression[] = [];

		for (const p of properties) {
			const lat = Number(p.latitude);
			const lng = Number(p.longitude);
			if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

			bounds.push([lat, lng]);

			const price = p.priceMonthly >= 1000
				? `£${(p.priceMonthly / 1000).toFixed(p.priceMonthly % 1000 === 0 ? 0 : 1)}k`
				: `£${p.priceMonthly}`;

			const icon = L.divIcon({
				className: "price-marker",
				html: `<span class="price-pill">${price}</span>`,
				iconSize: [60, 24],
				iconAnchor: [30, 12],
			});

			const marker = L.marker([lat, lng], { icon }).addTo(map);

			marker.bindPopup(`
				<div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 180px;">
					<div style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">${p.address}</div>
					<div style="font-size: 12px; color: #999;">
						£${p.priceMonthly.toLocaleString()} pcm${p.bedrooms != null ? ` · ${p.bedrooms} bed` : ""}
					</div>
				</div>
			`);

			marker.on("click", () => {
				goto(`/searches/${searchId}/properties/${p.propertyId}`);
			});
		}

		if (bounds.length > 0) {
			map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40] });
		}

		return () => {
			map?.remove();
			link.remove();
		};
	});
</script>

<div
	bind:this={mapContainer}
	style="width: 100%; height: 600px; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06);"
></div>

<style>
	:global(.price-marker) {
		background: transparent !important;
		border: none !important;
		overflow: visible !important;
	}
	:global(.price-pill) {
		display: inline-block;
		background: #c8913a;
		color: #000;
		padding: 3px 8px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 700;
		font-family: "Plus Jakarta Sans", sans-serif;
		white-space: nowrap;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
		cursor: pointer;
	}
	:global(.price-pill:hover) {
		background: #daa04d;
		transform: scale(1.05);
	}
	:global(.leaflet-popup-content-wrapper) {
		background: #1a1a1a;
		color: #eee;
		border-radius: 10px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
	}
	:global(.leaflet-popup-tip) {
		background: #1a1a1a;
	}
	:global(.leaflet-popup-close-button) {
		color: #888 !important;
	}
	:global(.leaflet-control-zoom a) {
		background: #1a1a1a !important;
		color: #ccc !important;
		border-color: rgba(255,255,255,0.1) !important;
	}
	:global(.leaflet-control-zoom a:hover) {
		background: #252525 !important;
	}
</style>
