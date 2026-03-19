<script lang="ts">
	type CommuteEntry = {
		userId: string;
		userName: string;
		destinationLabel: string;
		mode: string;
		durationMins: number | null;
	};

	let { commutes }: { commutes: CommuteEntry[] } = $props();

	const modeIcons: Record<string, string> = {
		transit: "\u{1F68C}",
		walking: "\u{1F6B6}",
		cycling: "\u{1F6B2}",
	};

	function chipStyle(mins: number | null): string {
		if (mins == null) return "background: rgba(113,113,122,0.2); color: rgb(161,161,170);";
		if (mins <= 20) return "background: rgba(16,185,129,0.2); color: rgb(110,231,183);";
		if (mins <= 40) return "background: rgba(245,158,11,0.2); color: rgb(252,211,77);";
		return "background: rgba(239,68,68,0.2); color: rgb(252,165,165);";
	}

	type GroupedCommutes = Map<string, { userName: string; entries: CommuteEntry[] }>;

	let grouped = $derived.by(() => {
		const map: GroupedCommutes = new Map();
		for (const c of commutes) {
			if (!map.has(c.userId)) {
				map.set(c.userId, { userName: c.userName, entries: [] });
			}
			map.get(c.userId)!.entries.push(c);
		}
		return map;
	});
</script>

{#if commutes.length > 0}
	<div style="display: flex; flex-direction: column; gap: 6px;">
		{#each [...grouped] as [, { userName, entries }]}
			<div style="display: flex; align-items: center; gap: 8px;">
				<span style="width: 48px; flex-shrink: 0; font-size: 12px; font-weight: 500; color: var(--muted-foreground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
					{userName.split(" ")[0]}
				</span>
				<div style="display: flex; gap: 6px;">
					{#each entries as entry}
						<span
							style="display: inline-flex; align-items: center; gap: 5px; border-radius: 6px; padding: 3px 8px; font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; {chipStyle(entry.durationMins)}"
							title="{entry.userName} \u2192 {entry.destinationLabel} ({entry.mode})"
						>
							<span style="font-size: 11px; line-height: 1;">{modeIcons[entry.mode] ?? entry.mode}</span>
							{entry.durationMins != null ? `${entry.durationMins}m` : "\u2014"}
						</span>
					{/each}
				</div>
			</div>
		{/each}
	</div>
{/if}
