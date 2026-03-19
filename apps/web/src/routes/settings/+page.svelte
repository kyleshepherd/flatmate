<svelte:head>
	<title>Settings - Flatmate</title>
</svelte:head>

<script lang="ts">
	import { enhance } from "$app/forms";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Avatar from "$lib/components/ui/avatar";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let showAddForm = $state(false);
	let label = $state("");
	let locationQuery = $state("");
	let latitude = $state("");
	let longitude = $state("");
	let transitChecked = $state(true);
	let walkingChecked = $state(false);
	let cyclingChecked = $state(false);

	type LocationResult = { display_name: string; lat: string; lon: string };
	let suggestions = $state<LocationResult[]>([]);
	let showSuggestions = $state(false);
	let selectedLocation = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout>;

	function onLocationInput() {
		selectedLocation = false;
		const q = locationQuery.trim();
		if (q.length < 3) {
			suggestions = [];
			showSuggestions = false;
			return;
		}

		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			const res = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=gb&limit=5`,
				{ headers: { "Accept": "application/json" } },
			);
			if (res.ok) {
				suggestions = await res.json();
				showSuggestions = suggestions.length > 0;
			}
		}, 300);
	}

	function selectLocation(loc: LocationResult) {
		locationQuery = loc.display_name;
		latitude = loc.lat;
		longitude = loc.lon;
		selectedLocation = true;
		showSuggestions = false;
	}

	function resetForm() {
		label = "";
		locationQuery = "";
		latitude = "";
		longitude = "";
		selectedLocation = false;
		transitChecked = true;
		walkingChecked = false;
		cyclingChecked = false;
		showAddForm = false;
	}
</script>

<div style="max-width: 640px; margin: 0 auto;">
	<h1 class="text-2xl font-bold tracking-tight">Settings</h1>

	<!-- Profile -->
	<div style="margin-top: 32px;">
		<h2 style="font-size: 15px; font-weight: 600; margin-bottom: 12px;">Profile</h2>
		<div style="display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: 12px; background: var(--card); border: 1px solid rgba(255,255,255,0.06);">
			<Avatar.Root class="h-12 w-12 ring-2 ring-border">
				<Avatar.Image src={data.user.image} alt={data.user.name} />
				<Avatar.Fallback class="text-lg font-semibold">{data.user.name?.[0] ?? "?"}</Avatar.Fallback>
			</Avatar.Root>
			<div>
				<p style="font-weight: 600;">{data.user.name}</p>
				<p style="font-size: 13px; color: var(--muted-foreground);">{data.user.email}</p>
			</div>
		</div>
	</div>

	<!-- Commute Destinations -->
	<div style="margin-top: 32px;">
		<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
			<h2 style="font-size: 15px; font-weight: 600;">Commute destinations</h2>
			{#if !showAddForm}
				<Button size="sm" variant="outline" onclick={() => (showAddForm = true)}>Add destination</Button>
			{/if}
		</div>

		{#if data.destinations.length === 0 && !showAddForm}
			<div style="padding: 32px; text-align: center; border-radius: 12px; border: 1px dashed rgba(255,255,255,0.1);">
				<p style="font-size: 14px; color: var(--muted-foreground);">No commute destinations set up yet.</p>
				<p style="font-size: 13px; color: var(--muted-foreground); margin-top: 4px;">Add your workplace or other destinations to see commute times on properties.</p>
			</div>
		{/if}

		<!-- Existing destinations -->
		{#each data.destinations as dest}
			<div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-radius: 12px; background: var(--card); border: 1px solid rgba(255,255,255,0.06); margin-bottom: 8px;">
				<div>
					<p style="font-weight: 600; font-size: 14px;">{dest.label}</p>
					<p style="font-size: 12px; color: var(--muted-foreground); margin-top: 2px;">
						{dest.modes.join(", ")}
					</p>
				</div>
				<form method="POST" action="?/deleteDestination" use:enhance>
					<input type="hidden" name="id" value={dest.id} />
					<Button type="submit" variant="outline" size="sm" style="color: var(--destructive);">Remove</Button>
				</form>
			</div>
		{/each}

		<!-- Add form -->
		{#if showAddForm}
			<form
				method="POST"
				action="?/addDestination"
				use:enhance={() => {
					return async ({ update }) => {
						resetForm();
						await update();
					};
				}}
				style="padding: 16px; border-radius: 12px; background: var(--card); border: 1px solid rgba(255,255,255,0.06); margin-top: 8px;"
			>
				<input type="hidden" name="latitude" value={latitude} />
				<input type="hidden" name="longitude" value={longitude} />

				<div style="display: flex; flex-direction: column; gap: 12px;">
					<div>
						<Label for="label">Label</Label>
						<Input id="label" name="label" bind:value={label} placeholder="e.g. Office, Gym" required />
					</div>

					<div>
						<Label for="location">Location</Label>
						<div style="position: relative;">
							<Input
								id="location"
								bind:value={locationQuery}
								oninput={onLocationInput}
								onfocus={() => { if (suggestions.length) showSuggestions = true; }}
								onblur={() => setTimeout(() => { showSuggestions = false; }, 150)}
								placeholder="Search for an address..."
								autocomplete="off"
							/>
							{#if showSuggestions}
								<div style="position: absolute; top: 100%; left: 0; right: 0; z-index: 50; margin-top: 4px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: var(--popover); box-shadow: 0 8px 24px rgba(0,0,0,0.4); overflow: hidden;">
									{#each suggestions as loc}
										<button
											type="button"
											onmousedown={() => selectLocation(loc)}
											style="display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 12px; text-align: left; font-size: 13px; border: none; background: transparent; color: var(--foreground); cursor: pointer;"
											class="hover:bg-accent"
										>
											<svg style="width: 14px; height: 14px; flex-shrink: 0; color: var(--muted-foreground);" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
												<path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
												<path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
											</svg>
											<span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{loc.display_name}</span>
										</button>
									{/each}
								</div>
							{/if}
						</div>
						{#if selectedLocation}
							<p style="margin-top: 4px; font-size: 11px; color: var(--muted-foreground);">
								{Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
							</p>
						{/if}
					</div>

					<div>
						<Label>Commute modes</Label>
						<div style="display: flex; gap: 12px; margin-top: 6px;">
							<label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px;">
								<input type="checkbox" name="modes" value="transit" bind:checked={transitChecked} />
								Transit
							</label>
							<label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px;">
								<input type="checkbox" name="modes" value="walking" bind:checked={walkingChecked} />
								Walking
							</label>
							<label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px;">
								<input type="checkbox" name="modes" value="cycling" bind:checked={cyclingChecked} />
								Cycling
							</label>
						</div>
					</div>

					<div style="display: flex; gap: 8px; justify-content: flex-end;">
						<Button type="button" variant="outline" size="sm" onclick={() => (showAddForm = false)}>Cancel</Button>
						<Button type="submit" size="sm" disabled={!label.trim() || !selectedLocation}>Add destination</Button>
					</div>
				</div>
			</form>
		{/if}
	</div>
</div>
