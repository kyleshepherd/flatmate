<script lang="ts">
	import "../app.css";
	import { onMount } from "svelte";
	import { browser } from "$app/environment";
	import type { Snippet } from "svelte";
	import type { LayoutData } from "./$types";
	import * as Avatar from "$lib/components/ui/avatar";

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	onMount(async () => {
		if (!browser || !data.session || !data.vapidPublicKey || !("serviceWorker" in navigator)) return;

		try {
			const reg = await navigator.serviceWorker.register("/service-worker.js");
			const existing = await reg.pushManager.getSubscription();
			if (existing) return; // Already subscribed

			const permission = await Notification.requestPermission();
			if (permission !== "granted") return;

			const sub = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: data.vapidPublicKey,
			});

			await fetch("/api/push/subscribe", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(sub.toJSON()),
			});
		} catch (err) {
			console.warn("Push subscription failed:", err);
		}
	});
</script>

<div class="min-h-screen bg-background text-foreground">
	{#if data.session}
		<header class="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-lg">
			<nav class="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
				<a href="/" class="text-lg font-bold tracking-tight text-foreground transition-opacity hover:opacity-70">
					flatmate
				</a>
				<div class="flex items-center gap-4">
					<a
						href="/settings"
						class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						Settings
					</a>
					<Avatar.Root class="h-8 w-8 ring-2 ring-border">
						<Avatar.Image src={data.session.user.image} alt={data.session.user.name} />
						<Avatar.Fallback class="text-xs font-semibold"
							>{data.session.user.name?.[0] ?? "?"}</Avatar.Fallback
						>
					</Avatar.Root>
				</div>
			</nav>
		</header>
		<main class="mx-auto max-w-5xl px-5 py-8">
			{@render children()}
		</main>
	{:else}
		{@render children()}
	{/if}
</div>
