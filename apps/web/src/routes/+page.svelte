<script lang="ts">
	import { Button } from "$lib/components/ui/button";
</script>

<div class="space-y-8">
	<div class="flex items-end justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Your searches</h1>
			<p class="mt-1 text-muted-foreground">Track rental properties with your group.</p>
		</div>
		<Button href="/searches/new" class="font-semibold">New search</Button>
	</div>

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
</div>
