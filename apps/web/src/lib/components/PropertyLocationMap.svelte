<script lang="ts">
	import { onMount } from "svelte";

	let { latitude, longitude }: { latitude: string; longitude: string } = $props();

	let mapContainer: HTMLDivElement;

	onMount(async () => {
		const L = await import("leaflet");

		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
		document.head.appendChild(link);

		await new Promise((resolve) => {
			link.onload = resolve;
			setTimeout(resolve, 1000);
		});

		if (!mapContainer) return;

		const lat = Number(latitude);
		const lng = Number(longitude);

		const map = L.map(mapContainer, {
			zoomControl: true,
		}).setView([lat, lng], 15);

		L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution: "",
			maxZoom: 19,
		}).addTo(map);

		const icon = L.divIcon({
			className: "location-pin",
			html: `<div style="width: 14px; height: 14px; background: #c8913a; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.5);"></div>`,
			iconSize: [14, 14],
			iconAnchor: [7, 7],
		});

		L.marker([lat, lng], { icon }).addTo(map);

		return () => {
			map.remove();
			link.remove();
		};
	});
</script>

<div
	bind:this={mapContainer}
	style="width: 100%; height: 300px; border-radius: 12px; overflow: hidden;"
></div>

<style>
	:global(.location-pin) {
		background: transparent !important;
		border: none !important;
	}
</style>
