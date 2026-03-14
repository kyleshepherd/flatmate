<script lang="ts">
	import { goto } from "$app/navigation";
	import { Button } from "$lib/components/ui/button";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();
	let joining = $state(false);

	async function join() {
		joining = true;
		try {
			const res = await fetch(`/api/searches/${data.search.id}/members`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ inviteCode: data.search.id }),
			});
			if (res.ok) {
				goto(`/searches/${data.search.id}`);
			}
		} finally {
			joining = false;
		}
	}
</script>

<div class="flex min-h-[60vh] items-center justify-center">
	<div class="w-full max-w-sm text-center">
		<div class="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
			&#128101;
		</div>
		<h1 class="text-2xl font-bold tracking-tight">You've been invited</h1>
		<p class="mt-2 text-muted-foreground">
			Join <span class="font-medium text-foreground">{data.search.name}</span> to collaborate on finding a place in {data.search.locationName}.
		</p>

		<div class="mt-8 space-y-3">
			<Button onclick={join} class="w-full font-semibold" disabled={joining}>
				{joining ? "Joining..." : "Join search"}
			</Button>
			<Button href="/" variant="outline" class="w-full">Back to dashboard</Button>
		</div>
	</div>
</div>
