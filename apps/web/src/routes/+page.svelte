<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();
</script>

<div class="space-y-8">
	<div class="flex items-end justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Your searches</h1>
			<p class="mt-1 text-muted-foreground">Track rental properties with your group.</p>
		</div>
		<Button href="/searches/new" class="font-semibold">New search</Button>
	</div>

	{#if data.searches.length === 0}
		<!-- Empty state -->
		<div
			class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 px-6 py-20 text-center"
		>
			<div
				class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl"
			>
				&#127968;
			</div>
			<p class="text-lg font-semibold">No searches yet</p>
			<p class="mt-1 max-w-xs text-sm text-muted-foreground">
				Create a search to start tracking rental properties from Rightmove. Invite your flatmates
				to collaborate.
			</p>
			<Button href="/searches/new" variant="outline" class="mt-6">Create your first search</Button>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2">
			{#each data.searches as search}
				<a
					href="/searches/{search.id}"
					class="group rounded-xl border border-border/70 bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
				>
					<div class="flex items-start justify-between">
						<div class="min-w-0 flex-1">
							<h3 class="truncate font-semibold tracking-tight group-hover:text-primary transition-colors">
								{search.name}
							</h3>
							<p class="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
								<svg class="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
									<path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
								</svg>
								<span class="truncate">{search.locationName}</span>
							</p>
						</div>
						{#if search.role === "owner"}
							<span class="ml-2 shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
								Owner
							</span>
						{/if}
					</div>
					<div class="mt-4 flex items-center justify-between text-xs text-muted-foreground">
						<span>
							{search.radius === "0" ? "This area only" : `${search.radius} mi radius`}
						</span>
						<svg class="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
						</svg>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
