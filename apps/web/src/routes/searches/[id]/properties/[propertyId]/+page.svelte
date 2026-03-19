<script lang="ts">
	import { enhance } from "$app/forms";
	import { Button } from "$lib/components/ui/button";
	import * as Select from "$lib/components/ui/select";
	import CommuteChips from "$lib/components/CommuteChips.svelte";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let currentImage = $state(0);
	let commentText = $state("");

	const images = $derived(data.property.images ?? []);
	const floorplans = $derived(data.property.floorplanUrls ?? []);

	function fullSizeUrl(url: string): string {
		// Strip crop prefix and size suffix to get full-res image
		return url.replace("/dir/crop/10:9-16:9/", "/").replace(/_max_\d+x\d+/, "");
	}
	function thumbUrl(url: string): string {
		return url.replace(/_max_\d+x\d+/, "_max_296x197");
	}

	const statusOptions = [
		{ value: "new", label: "New" },
		{ value: "interested", label: "Interested" },
		{ value: "viewing_booked", label: "Viewing Booked" },
		{ value: "applied", label: "Applied" },
		{ value: "rejected", label: "Rejected" },
		{ value: "not_interested", label: "Not Interested" },
	];

	function formatDate(d: Date | string) {
		return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
	}
</script>

<div style="max-width: 900px; margin: 0 auto;">
	<!-- Back link -->
	<a
		href="/searches/{data.search.id}"
		class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
	>
		<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
		</svg>
		{data.search.name}
	</a>

	<!-- Image gallery -->
	<div style="margin-top: 16px; border-radius: 16px; overflow: hidden; background: #111;">
		{#if images.length > 0}
			<div style="position: relative; height: 480px;">
				<img
					src={fullSizeUrl(images[currentImage]?.url ?? "")}
					alt="Property photo {currentImage + 1}"
					style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; background: #111;"
				/>
				<!-- Image counter -->
				<div style="position: absolute; bottom: 16px; right: 16px; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); border-radius: 8px; padding: 5px 14px; font-size: 13px; color: white; font-weight: 600;">
					{currentImage + 1} / {images.length}
				</div>
				<!-- Nav arrows -->
				{#if images.length > 1}
					<button
						onclick={() => currentImage = (currentImage - 1 + images.length) % images.length}
						style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); width: 40px; height: 40px; border-radius: 50%; background: rgba(0,0,0,0.7); border: 1px solid rgba(255,255,255,0.15); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;"
					>
						<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
					</button>
					<button
						onclick={() => currentImage = (currentImage + 1) % images.length}
						style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%); width: 40px; height: 40px; border-radius: 50%; background: rgba(0,0,0,0.7); border: 1px solid rgba(255,255,255,0.15); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;"
					>
						<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
					</button>
				{/if}
			</div>
		{:else}
			<div style="height: 300px; display: flex; align-items: center; justify-content: center; font-size: 3rem; opacity: 0.3;">&#127968;</div>
		{/if}

		<!-- Thumbnail strip -->
		{#if images.length > 1}
			<div style="display: flex; gap: 6px; padding: 10px; overflow-x: auto; background: #0a0a0a;">
				{#each images as img, i}
					<button
						onclick={() => currentImage = i}
						style="flex-shrink: 0; width: 72px; height: 52px; border-radius: 8px; overflow: hidden; border: 2px solid {i === currentImage ? 'var(--primary)' : 'transparent'}; cursor: pointer; opacity: {i === currentImage ? '1' : '0.5'}; transition: all 0.15s;"
					>
						<img src={thumbUrl(img.url)} alt="" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" />
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Main content -->
	<div style="margin-top: 24px; display: grid; grid-template-columns: 1fr; gap: 24px;" class="detail-grid">
		<!-- Left column -->
		<div style="display: flex; flex-direction: column; gap: 24px;">
			<!-- Price + Address -->
			<div>
				<div style="display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap;">
					<span style="font-size: 28px; font-weight: 800; color: var(--primary);">£{data.property.priceMonthly.toLocaleString()}</span>
					<span style="font-size: 14px; color: var(--muted-foreground);">pcm</span>
				</div>
				<h1 style="margin-top: 4px; font-size: 20px; font-weight: 700; letter-spacing: -0.01em;">{data.property.address}</h1>
				<p style="margin-top: 2px; font-size: 14px; color: var(--muted-foreground);">{data.property.propertyType}</p>
			</div>

			<!-- Quick details -->
			<div style="display: flex; gap: 8px; flex-wrap: wrap;">
				{#if data.property.bedrooms != null}
					<span style="display: inline-flex; align-items: center; gap: 5px; font-size: 13px; padding: 4px 12px; border-radius: 6px; background: var(--secondary); color: var(--foreground); font-weight: 500;">
						<svg style="width: 15px; height: 15px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10c0 1.1.9 2 2 2h14a2 2 0 002-2V7M3 7h18M3 7l2-4h14l2 4M8 14h8" /></svg>
						{data.property.bedrooms} bed
					</span>
				{/if}
				{#if data.property.bathrooms != null}
					<span style="display: inline-flex; align-items: center; gap: 5px; font-size: 13px; padding: 4px 12px; border-radius: 6px; background: var(--secondary); color: var(--foreground); font-weight: 500;">
						<svg style="width: 15px; height: 15px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 14h18v3a3 3 0 01-3 3H6a3 3 0 01-3-3v-3zM3 14V5a2 2 0 012-2h1a2 2 0 012 2v1" /></svg>
						{data.property.bathrooms} bath
					</span>
				{/if}
				<span style="display: inline-flex; align-items: center; gap: 5px; font-size: 13px; padding: 4px 12px; border-radius: 6px; background: var(--secondary); color: var(--foreground); font-weight: 500;">
					<svg style="width: 15px; height: 15px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
					{data.property.availableDate ?? "Ask agent"}
				</span>
			</div>

			<!-- Actions row -->
			<div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
				<form method="POST" action="?/updateStatus" use:enhance>
					<Select.Root type="single" value={data.searchProperty.status} onValueChange={(v) => {
						if (!v) return;
						const form = document.createElement("form");
						form.method = "POST";
						form.action = "?/updateStatus";
						const input = document.createElement("input");
						input.name = "status";
						input.value = v;
						form.appendChild(input);
						document.body.appendChild(form);
						form.submit();
					}}>
						<Select.Trigger class="w-44">
							{statusOptions.find((o) => o.value === data.searchProperty.status)?.label ?? "New"}
						</Select.Trigger>
						<Select.Content>
							{#each statusOptions as opt}
								<Select.Item value={opt.value} label={opt.label} />
							{/each}
						</Select.Content>
					</Select.Root>
				</form>

				<form method="POST" action="?/toggleShortlist" use:enhance>
					<Button type="submit" variant={data.searchProperty.shortlisted ? "default" : "outline"} size="sm">
						{data.searchProperty.shortlisted ? "\u2605 Shortlisted" : "\u2606 Shortlist"}
					</Button>
				</form>

				<a href={data.property.rightmoveUrl} target="_blank" rel="noopener" class="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">
					View on Rightmove
				</a>
			</div>

			<!-- Key features -->
			{#if data.property.keyFeatures && data.property.keyFeatures.length > 0}
				<div>
					<h2 style="font-size: 15px; font-weight: 600; margin-bottom: 8px;">Key features</h2>
					<ul style="display: flex; flex-direction: column; gap: 4px;">
						{#each data.property.keyFeatures as feature}
							<li style="font-size: 13px; color: var(--muted-foreground); padding-left: 16px; position: relative;">
								<span style="position: absolute; left: 0; color: var(--primary);">&bull;</span>
								{feature}
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- Description -->
			{#if data.property.summary}
				<div>
					<h2 style="font-size: 15px; font-weight: 600; margin-bottom: 8px;">Description</h2>
					<p style="font-size: 13px; line-height: 1.6; color: var(--muted-foreground);">{data.property.summary}</p>
				</div>
			{/if}

			<!-- Agent -->
			<div style="padding: 16px; border-radius: 12px; background: var(--secondary);">
				<p style="font-size: 13px; font-weight: 600;">{data.property.agentName}</p>
				{#if data.property.agentPhone}
					<a href="tel:{data.property.agentPhone}" style="font-size: 13px; color: var(--primary); margin-top: 2px; display: block;">{data.property.agentPhone}</a>
				{/if}
			</div>

			<!-- Floorplans -->
			{#if floorplans.length > 0}
				<div>
					<h2 style="font-size: 15px; font-weight: 600; margin-bottom: 8px;">Floorplan{floorplans.length > 1 ? "s" : ""}</h2>
					<div style="display: flex; flex-direction: column; gap: 8px;">
						{#each floorplans as url}
							<img src={url} alt="Floorplan" style="width: 100%; border-radius: 12px; background: white;" loading="lazy" />
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Right column (sidebar) -->
		<div style="display: flex; flex-direction: column; gap: 24px;">
			<!-- Commute times -->
			{#if data.commutes.length > 0}
				<div style="padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); background: var(--card);">
					<h2 style="font-size: 15px; font-weight: 600; margin-bottom: 12px;">Commute times</h2>
					<CommuteChips commutes={data.commutes} />
				</div>
			{/if}

			<!-- Price history -->
			{#if data.changes.length > 0}
				<div style="padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); background: var(--card);">
					<h2 style="font-size: 15px; font-weight: 600; margin-bottom: 12px;">Changes</h2>
					<div style="display: flex; flex-direction: column; gap: 8px;">
						{#each data.changes as change}
							<div style="font-size: 12px; color: var(--muted-foreground);">
								<span style="font-weight: 500; color: var(--foreground);">{change.field.replace("_", " ")}</span>:
								{change.oldValue} &rarr; {change.newValue}
								<span style="margin-left: 4px; opacity: 0.6;">{formatDate(change.changedAt)}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Comments -->
			<div style="padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); background: var(--card);">
				<h2 style="font-size: 15px; font-weight: 600; margin-bottom: 12px;">
					Comments {#if data.comments.length > 0}<span style="font-weight: 400; color: var(--muted-foreground);">({data.comments.length})</span>{/if}
				</h2>

				{#if data.comments.length > 0}
					<div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
						{#each data.comments as comment}
							<div style="display: flex; gap: 10px;">
								<div style="flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; background: var(--secondary); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; overflow: hidden;">
									{#if comment.userImage}
										<img src={comment.userImage} alt="" style="width: 100%; height: 100%; object-fit: cover;" />
									{:else}
										{comment.userName?.[0] ?? "?"}
									{/if}
								</div>
								<div style="min-width: 0; flex: 1;">
									<div style="display: flex; align-items: baseline; gap: 6px;">
										<span style="font-size: 12px; font-weight: 600;">{comment.userName}</span>
										<span style="font-size: 11px; color: var(--muted-foreground);">{formatDate(comment.createdAt)}</span>
									</div>
									<p style="margin-top: 2px; font-size: 13px; color: var(--muted-foreground); line-height: 1.5;">{comment.body}</p>
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<form method="POST" action="?/comment" use:enhance={() => {
					return async ({ update }) => {
						commentText = "";
						await update();
					};
				}}>
					<div style="display: flex; gap: 8px;">
						<input
							name="body"
							bind:value={commentText}
							placeholder="Add a comment..."
							style="flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: var(--secondary); color: var(--foreground); font-size: 13px; outline: none;"
						/>
						<Button type="submit" size="sm" disabled={!commentText.trim()}>Post</Button>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>

<style>
	.detail-grid {
		grid-template-columns: 1fr;
	}
	@media (min-width: 768px) {
		.detail-grid {
			grid-template-columns: 1fr 320px;
		}
	}
</style>
