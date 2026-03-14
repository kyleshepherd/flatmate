<script lang="ts">
	import { goto } from "$app/navigation";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";

	type Location = { displayName: string; locationIdentifier: string };

	let name = $state("");
	let locationQuery = $state("");
	let selectedLocation = $state<Location | null>(null);
	let suggestions = $state<Location[]>([]);
	let showSuggestions = $state(false);
	let radius = $state("0");
	let minPrice = $state("");
	let maxPrice = $state("");
	let minBedrooms = $state("");
	let maxBedrooms = $state("");
	let propertyType = $state("");
	let availableFrom = $state("");
	let availableTo = $state("");
	let submitting = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout>;

	const radiusOptions = [
		{ value: "0", label: "This area only" },
		{ value: "0.25", label: "Within \u00BC mile" },
		{ value: "0.5", label: "Within \u00BD mile" },
		{ value: "1", label: "Within 1 mile" },
		{ value: "3", label: "Within 3 miles" },
		{ value: "5", label: "Within 5 miles" },
		{ value: "10", label: "Within 10 miles" },
		{ value: "15", label: "Within 15 miles" },
		{ value: "20", label: "Within 20 miles" },
		{ value: "30", label: "Within 30 miles" },
		{ value: "40", label: "Within 40 miles" },
	];

	const priceOptions = [
		{ value: "", label: "No min" },
		{ value: "200", label: "\u00A3200 pcm" },
		{ value: "300", label: "\u00A3300 pcm" },
		{ value: "400", label: "\u00A3400 pcm" },
		{ value: "500", label: "\u00A3500 pcm" },
		{ value: "600", label: "\u00A3600 pcm" },
		{ value: "700", label: "\u00A3700 pcm" },
		{ value: "800", label: "\u00A3800 pcm" },
		{ value: "900", label: "\u00A3900 pcm" },
		{ value: "1000", label: "\u00A31,000 pcm" },
		{ value: "1250", label: "\u00A31,250 pcm" },
		{ value: "1500", label: "\u00A31,500 pcm" },
		{ value: "1750", label: "\u00A31,750 pcm" },
		{ value: "2000", label: "\u00A32,000 pcm" },
		{ value: "2500", label: "\u00A32,500 pcm" },
		{ value: "3000", label: "\u00A33,000 pcm" },
		{ value: "3500", label: "\u00A33,500 pcm" },
		{ value: "4000", label: "\u00A34,000 pcm" },
		{ value: "5000", label: "\u00A35,000 pcm" },
	];

	const maxPriceOptions = [
		{ value: "", label: "No max" },
		...priceOptions.slice(1),
	];

	const bedroomOptions = [
		{ value: "", label: "Any" },
		{ value: "0", label: "Studio" },
		{ value: "1", label: "1" },
		{ value: "2", label: "2" },
		{ value: "3", label: "3" },
		{ value: "4", label: "4" },
		{ value: "5", label: "5+" },
	];

	const propertyTypeOptions = [
		{ value: "", label: "Any" },
		{ value: "detached", label: "Detached" },
		{ value: "semi-detached", label: "Semi-detached" },
		{ value: "terraced", label: "Terraced" },
		{ value: "flat", label: "Flats / Apartments" },
		{ value: "bungalow", label: "Bungalows" },
	];

	function onLocationInput() {
		const q = locationQuery.trim();
		if (q.length < 2) {
			suggestions = [];
			showSuggestions = false;
			return;
		}

		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			const res = await fetch(`/api/location-suggest?q=${encodeURIComponent(q)}`);
			if (res.ok) {
				suggestions = await res.json();
				showSuggestions = suggestions.length > 0;
			}
		}, 250);
	}

	function selectLocation(loc: Location) {
		selectedLocation = loc;
		locationQuery = loc.displayName;
		showSuggestions = false;
	}

	function clearLocation() {
		selectedLocation = null;
		locationQuery = "";
		suggestions = [];
	}

	async function handleSubmit() {
		if (!selectedLocation || !name.trim()) return;
		submitting = true;

		try {
			const res = await fetch("/api/searches", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: name.trim(),
					locationIdentifier: selectedLocation.locationIdentifier,
					locationName: selectedLocation.displayName,
					radius,
					minPrice: minPrice ? Number(minPrice) : null,
					maxPrice: maxPrice ? Number(maxPrice) : null,
					minBedrooms: minBedrooms ? Number(minBedrooms) : null,
					maxBedrooms: maxBedrooms ? Number(maxBedrooms) : null,
					propertyType: propertyType || null,
					includeLetAgreed: false,
					availableFrom: availableFrom || null,
					availableTo: availableTo || null,
				}),
			});

			if (res.ok) {
				const { id } = await res.json();
				goto(`/searches/${id}`);
			}
		} finally {
			submitting = false;
		}
	}
</script>

<div class="mx-auto max-w-2xl space-y-8">
	<div>
		<a
			href="/"
			class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
			</svg>
			Back
		</a>
		<h1 class="text-3xl font-bold tracking-tight">New search</h1>
		<p class="mt-1 text-muted-foreground">Set up your Rightmove search criteria.</p>
	</div>

	<form onsubmit={handleSubmit} class="space-y-8">
		<!-- Search name -->
		<div class="space-y-2">
			<Label for="name">Search name</Label>
			<Input
				id="name"
				bind:value={name}
				placeholder="e.g. South London 2-bed flats"
				required
			/>
		</div>

		<!-- Location -->
		<div class="space-y-2">
			<Label for="location">Location</Label>
			<div class="relative">
				{#if selectedLocation}
					<div
						class="flex items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
					>
						<span>{selectedLocation.displayName}</span>
						<button
							type="button"
							onclick={clearLocation}
							class="ml-2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
						>
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
				{:else}
					<Input
						id="location"
						bind:value={locationQuery}
						oninput={onLocationInput}
						onfocus={() => { if (suggestions.length) showSuggestions = true; }}
						onblur={() => setTimeout(() => { showSuggestions = false; }, 150)}
						placeholder="Search for a city, area, or postcode..."
						autocomplete="off"
					/>
					{#if showSuggestions}
						<div
							class="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg"
						>
							{#each suggestions as loc}
								<button
									type="button"
									class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
									onmousedown={() => selectLocation(loc)}
								>
									<svg class="h-4 w-4 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
									</svg>
									<span>{loc.displayName}</span>
								</button>
							{/each}
						</div>
					{/if}
				{/if}
			</div>
		</div>

		<!-- Radius -->
		<div class="space-y-2">
			<Label>Search radius</Label>
			<Select.Root type="single" bind:value={radius}>
				<Select.Trigger class="w-full">
					{radiusOptions.find((o) => o.value === radius)?.label ?? "This area only"}
				</Select.Trigger>
				<Select.Content>
					{#each radiusOptions as opt}
						<Select.Item value={opt.value} label={opt.label} />
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<!-- Price range -->
		<div class="space-y-2">
			<Label>Price range</Label>
			<div class="grid grid-cols-2 gap-3">
				<Select.Root type="single" bind:value={minPrice}>
					<Select.Trigger class="w-full">
						{priceOptions.find((o) => o.value === minPrice)?.label ?? "No min"}
					</Select.Trigger>
					<Select.Content>
						{#each priceOptions as opt}
							<Select.Item value={opt.value} label={opt.label} />
						{/each}
					</Select.Content>
				</Select.Root>
				<Select.Root type="single" bind:value={maxPrice}>
					<Select.Trigger class="w-full">
						{maxPriceOptions.find((o) => o.value === maxPrice)?.label ?? "No max"}
					</Select.Trigger>
					<Select.Content>
						{#each maxPriceOptions as opt}
							<Select.Item value={opt.value} label={opt.label} />
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</div>

		<!-- Bedrooms -->
		<div class="space-y-2">
			<Label>Bedrooms</Label>
			<div class="grid grid-cols-2 gap-3">
				<Select.Root type="single" bind:value={minBedrooms}>
					<Select.Trigger class="w-full">
						{minBedrooms ? (bedroomOptions.find((o) => o.value === minBedrooms)?.label ?? "Any") + " min" : "No min"}
					</Select.Trigger>
					<Select.Content>
						{#each bedroomOptions as opt}
							<Select.Item value={opt.value} label={opt.label} />
						{/each}
					</Select.Content>
				</Select.Root>
				<Select.Root type="single" bind:value={maxBedrooms}>
					<Select.Trigger class="w-full">
						{maxBedrooms ? (bedroomOptions.find((o) => o.value === maxBedrooms)?.label ?? "Any") + " max" : "No max"}
					</Select.Trigger>
					<Select.Content>
						{#each bedroomOptions as opt}
							<Select.Item value={opt.value} label={opt.label} />
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</div>

		<!-- Property type -->
		<div class="space-y-2">
			<Label>Property type</Label>
			<Select.Root type="single" bind:value={propertyType}>
				<Select.Trigger class="w-full">
					{propertyTypeOptions.find((o) => o.value === propertyType)?.label ?? "Any"}
				</Select.Trigger>
				<Select.Content>
					{#each propertyTypeOptions as opt}
						<Select.Item value={opt.value} label={opt.label} />
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<!-- Availability window -->
		<div class="space-y-2">
			<Label>Availability window <span class="text-muted-foreground">(optional)</span></Label>
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="availableFrom" class="mb-1 block text-xs text-muted-foreground">From</label>
					<Input id="availableFrom" type="date" bind:value={availableFrom} />
				</div>
				<div>
					<label for="availableTo" class="mb-1 block text-xs text-muted-foreground">To</label>
					<Input id="availableTo" type="date" bind:value={availableTo} />
				</div>
			</div>
		</div>

		<!-- Submit -->
		<div class="flex gap-3 border-t border-border pt-6">
			<Button href="/" variant="outline" class="flex-1">Cancel</Button>
			<Button
				type="submit"
				class="flex-1 font-semibold"
				disabled={!name.trim() || !selectedLocation || submitting}
			>
				{submitting ? "Creating..." : "Create search"}
			</Button>
		</div>
	</form>
</div>
