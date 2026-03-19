<svelte:head>
	<title>{data.search.name} - Flatmate</title>
</svelte:head>

<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";
	import { Button } from "$lib/components/ui/button";
	import * as Select from "$lib/components/ui/select";
	import * as Dialog from "$lib/components/ui/dialog";
	import PropertyCard from "$lib/components/PropertyCard.svelte";
	import type { PageData } from "./$types";

	let PropertyMap: typeof import("$lib/components/PropertyMap.svelte").default | null = $state(null);

	let { data }: { data: PageData } = $props();
	let viewMode = $derived(($page.url.searchParams.get("view") ?? "list") as "list" | "map");

	// Lazy-load map component when switching to map view
	$effect(() => {
		if (viewMode === "map" && !PropertyMap) {
			import("$lib/components/PropertyMap.svelte").then((mod) => {
				PropertyMap = mod.default;
			});
		}
	});

	let copied = $state(false);

	function copyInviteLink() {
		const link = `${$page.url.origin}/invite/${data.search.inviteCode}`;
		navigator.clipboard.writeText(link);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function setSort(value: string) {
		const url = new URL($page.url);
		url.searchParams.set("sort", value);
		goto(url.toString(), { replaceState: true });
	}

	function setTab(value: string) {
		const url = new URL($page.url);
		if (value) {
			url.searchParams.set("status", value);
		} else {
			url.searchParams.delete("status");
		}
		goto(url.toString(), { replaceState: true });
	}

	const tabs = [
		{ value: "", label: "All" },
		{ value: "new", label: "New" },
		{ value: "interested", label: "Interested" },
		{ value: "viewing_booked", label: "Viewing" },
		{ value: "applied", label: "Applied" },
		{ value: "rejected", label: "Rejected" },
		{ value: "not_interested", label: "Not Interested" },
	];

	const sortOptions = [
		{ value: "newest", label: "Newest first" },
		{ value: "price_asc", label: "Price: low to high" },
		{ value: "price_desc", label: "Price: high to low" },
	];

	let activeTab = $derived(data.statusFilter ?? "");

	// Management
	let settingsOpen = $state(false);
	let editingName = $state(false);
	let nameInput = $state(data.search.name);
	let confirmDelete = $state(false);

	async function updateName() {
		await fetch(`/api/searches/${data.search.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: nameInput }),
		});
		editingName = false;
		location.reload();
	}

	async function toggleActive() {
		await fetch(`/api/searches/${data.search.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ isActive: !data.search.isActive }),
		});
		location.reload();
	}

	async function removeMember(userId: string) {
		await fetch(`/api/searches/${data.search.id}/members?userId=${userId}`, { method: "DELETE" });
		location.reload();
	}

	async function deleteSearch() {
		await fetch(`/api/searches/${data.search.id}`, { method: "DELETE" });
		goto("/");
	}

	// "All" tab hides not_interested
	let filteredProperties = $derived(
		activeTab === ""
			? data.properties.filter((p) => p.status !== "not_interested")
			: data.properties,
	);
</script>

<div>
	<!-- Header -->
	<div style="margin-bottom: 24px;">
		<a
			href="/"
			class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
			</svg>
			Back
		</a>

		<div class="flex items-start justify-between">
			<div>
				<h1 class="text-2xl font-bold tracking-tight">{data.search.name}</h1>
				<div class="mt-1 space-y-0.5 text-sm text-muted-foreground">
					<p>{data.search.locationName}</p>
					<p>{data.statusCounts[""] ?? 0} properties &middot; {data.members.length} {data.members.length === 1 ? "member" : "members"}</p>
				</div>
			</div>

			<div style="display: flex; gap: 8px;">
				<Button variant="outline" size="sm" onclick={copyInviteLink}>
					{copied ? "Copied!" : "Share invite"}
				</Button>
				{#if data.role === "owner"}
					<Button variant="outline" size="sm" onclick={() => (settingsOpen = true)}>
						<svg style="width: 16px; height: 16px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
					</Button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Settings dialog -->
	{#if data.role === "owner"}
		<Dialog.Root bind:open={settingsOpen}>
			<Dialog.Content class="max-w-md">
				<Dialog.Header>
					<Dialog.Title>Search settings</Dialog.Title>
				</Dialog.Header>

				<div style="display: flex; flex-direction: column; gap: 20px; margin-top: 8px;">
					<!-- Name -->
					<div>
						<p style="font-size: 13px; font-weight: 600; margin-bottom: 6px;">Name</p>
						{#if editingName}
							<div style="display: flex; gap: 8px;">
								<input
									bind:value={nameInput}
									style="flex: 1; padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: var(--secondary); color: var(--foreground); font-size: 13px;"
								/>
								<Button size="sm" onclick={updateName}>Save</Button>
								<Button size="sm" variant="outline" onclick={() => { editingName = false; nameInput = data.search.name; }}>Cancel</Button>
							</div>
						{:else}
							<div style="display: flex; align-items: center; justify-content: space-between;">
								<span style="font-size: 14px;">{data.search.name}</span>
								<Button size="sm" variant="outline" onclick={() => (editingName = true)}>Edit</Button>
							</div>
						{/if}
					</div>

					<!-- Active toggle -->
					<div>
						<div style="display: flex; align-items: center; justify-content: space-between;">
							<div>
								<p style="font-size: 13px; font-weight: 600;">Scraping</p>
								<p style="font-size: 12px; color: var(--muted-foreground);">{data.search.isActive ? "Active — scraper is running" : "Paused — scraper is not running"}</p>
							</div>
							<Button size="sm" variant="outline" onclick={toggleActive}>
								{data.search.isActive ? "Pause" : "Resume"}
							</Button>
						</div>
					</div>

					<!-- Members -->
					<div>
						<p style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">Members</p>
						<div style="display: flex; flex-direction: column; gap: 6px;">
							{#each data.members as member}
								<div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 8px; background: var(--secondary);">
									<div style="display: flex; align-items: center; gap: 8px;">
										{#if member.image}
											<img src={member.image} alt="" style="width: 24px; height: 24px; border-radius: 50%;" />
										{/if}
										<span style="font-size: 13px;">{member.name}</span>
										{#if member.role === "owner"}
											<span style="font-size: 10px; color: var(--primary); font-weight: 600;">Owner</span>
										{/if}
									</div>
									{#if member.role !== "owner"}
										<button
											onclick={() => removeMember(member.userId)}
											style="font-size: 12px; color: var(--destructive); background: none; border: none; cursor: pointer; padding: 2px 6px;"
										>Remove</button>
									{/if}
								</div>
							{/each}
						</div>
					</div>

					<!-- Delete -->
					<div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px;">
						{#if confirmDelete}
							<p style="font-size: 13px; color: var(--destructive); margin-bottom: 8px;">This will permanently delete the search and all its data.</p>
							<div style="display: flex; gap: 8px;">
								<Button variant="destructive" size="sm" onclick={deleteSearch}>Yes, delete</Button>
								<Button variant="outline" size="sm" onclick={() => (confirmDelete = false)}>Cancel</Button>
							</div>
						{:else}
							<Button variant="outline" size="sm" onclick={() => (confirmDelete = true)} style="color: var(--destructive);">Delete search</Button>
						{/if}
					</div>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	{/if}

	<!-- Status tabs -->
	<div style="margin-bottom: 16px; display: flex; gap: 4px; overflow-x: auto; padding-bottom: 2px;" class="hide-scrollbar">
		{#each tabs as tab}
			<button
				onclick={() => setTab(tab.value)}
				style="
					flex-shrink: 0;
					padding: 6px 14px;
					border-radius: 8px;
					font-size: 13px;
					font-weight: 500;
					border: none;
					cursor: pointer;
					transition: all 0.15s;
					background: {activeTab === tab.value ? 'var(--primary)' : 'var(--secondary)'};
					color: {activeTab === tab.value ? 'var(--primary-foreground)' : 'var(--muted-foreground)'};
				"
			>
				{tab.label}
				{#if (data.statusCounts[tab.value] ?? 0) > 0}
					<span style="
						margin-left: 4px;
						font-size: 11px;
						opacity: {activeTab === tab.value ? '0.8' : '0.5'};
					">{data.statusCounts[tab.value]}</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Sort + View toggle -->
	<div style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
		<Select.Root
			type="single"
			value={data.sort}
			onValueChange={(v) => { if (v) setSort(v); }}
		>
			<Select.Trigger class="w-44" size="sm">
				{sortOptions.find((o) => o.value === data.sort)?.label ?? "Newest first"}
			</Select.Trigger>
			<Select.Content>
				{#each sortOptions as opt}
					<Select.Item value={opt.value} label={opt.label} />
				{/each}
			</Select.Content>
		</Select.Root>

		<div style="display: flex; gap: 2px; background: var(--secondary); border-radius: 8px; padding: 2px;">
			<button
				onclick={() => { const u = new URL($page.url); u.searchParams.delete("view"); goto(u.toString(), { replaceState: true }); }}
				style="padding: 5px 10px; border-radius: 6px; border: none; cursor: pointer; display: flex; align-items: center; background: {viewMode === 'list' ? 'var(--card)' : 'transparent'}; color: {viewMode === 'list' ? 'var(--foreground)' : 'var(--muted-foreground)'}; transition: all 0.15s;"
			>
				<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
			</button>
			<button
				onclick={() => { const u = new URL($page.url); u.searchParams.set("view", "map"); goto(u.toString(), { replaceState: true }); }}
				style="padding: 5px 10px; border-radius: 6px; border: none; cursor: pointer; display: flex; align-items: center; background: {viewMode === 'map' ? 'var(--card)' : 'transparent'}; color: {viewMode === 'map' ? 'var(--foreground)' : 'var(--muted-foreground)'}; transition: all 0.15s;"
			>
				<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
			</button>
		</div>
	</div>

	<!-- Content -->
	{#if viewMode === "map" && PropertyMap}
		<PropertyMap properties={filteredProperties} searchId={data.search.id} />
	{:else if filteredProperties.length === 0}
		<div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 px-6 py-20 text-center">
			<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
				&#128269;
			</div>
			<p class="text-lg font-semibold">No properties</p>
			<p class="mt-1 max-w-xs text-sm text-muted-foreground">
				{#if activeTab === ""}
					The scraper hasn't found any properties for this search yet.
				{:else}
					No properties with this status yet.
				{/if}
			</p>
		</div>
	{:else}
		<div class="property-grid">
			{#each filteredProperties as property (property.propertyId)}
				<PropertyCard {property} searchId={data.search.id} />
			{/each}
		</div>
	{/if}
</div>

<style>
	.property-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 16px;
	}
	@media (min-width: 640px) {
		.property-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 20px;
		}
	}
	.hide-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
	.hide-scrollbar::-webkit-scrollbar {
		display: none;
	}
</style>
