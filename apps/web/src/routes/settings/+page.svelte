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
	let latitude = $state("");
	let longitude = $state("");
	let transitChecked = $state(true);
	let walkingChecked = $state(false);
	let cyclingChecked = $state(false);
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
						{dest.modes.join(", ")} &middot; {Number(dest.latitude).toFixed(4)}, {Number(dest.longitude).toFixed(4)}
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
						label = "";
						latitude = "";
						longitude = "";
						showAddForm = false;
						await update();
					};
				}}
				style="padding: 16px; border-radius: 12px; background: var(--card); border: 1px solid rgba(255,255,255,0.06); margin-top: 8px;"
			>
				<div style="display: flex; flex-direction: column; gap: 12px;">
					<div>
						<Label for="label">Label</Label>
						<Input id="label" name="label" bind:value={label} placeholder="e.g. Office, Gym" required />
					</div>

					<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
						<div>
							<Label for="latitude">Latitude</Label>
							<Input id="latitude" name="latitude" bind:value={latitude} placeholder="51.5234" required />
						</div>
						<div>
							<Label for="longitude">Longitude</Label>
							<Input id="longitude" name="longitude" bind:value={longitude} placeholder="-0.1045" required />
						</div>
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
						<Button type="submit" size="sm">Add destination</Button>
					</div>
				</div>
			</form>
		{/if}
	</div>
</div>
