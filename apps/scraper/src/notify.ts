export async function notifyNewProperties(
	notifyEndpoint: string,
	scraperSecret: string,
	searchId: string,
	newPropertyIds: string[],
	changedProperties: Array<{ id: string; changes: unknown[] }>,
): Promise<void> {
	if (newPropertyIds.length === 0 && changedProperties.length === 0) return;
	if (!notifyEndpoint) {
		console.log(
			`  [notify] ${newPropertyIds.length} new, ${changedProperties.length} changed (no endpoint configured)`,
		);
		return;
	}

	try {
		const res = await fetch(notifyEndpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${scraperSecret}`,
			},
			body: JSON.stringify({ searchId, newPropertyIds, changedProperties }),
		});

		if (!res.ok) {
			console.warn(`  [notify] endpoint returned ${res.status}: ${await res.text()}`);
		} else {
			const data = await res.json();
			console.log(`  [notify] sent to ${data.sent} subscribers`);
		}
	} catch (err) {
		console.warn("  [notify] failed:", err);
	}
}
