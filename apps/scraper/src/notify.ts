// Stub — real implementation in Task 21 (push notifications)
export async function notifyNewProperties(
	_endpoint: string,
	_secret: string,
	_searchId: string,
	newPropertyIds: string[],
	changedProps: Array<{ id: string; changes: unknown[] }>,
) {
	if (newPropertyIds.length > 0) {
		console.log(`  [notify stub] ${newPropertyIds.length} new properties`);
	}
	if (changedProps.length > 0) {
		console.log(`  [notify stub] ${changedProps.length} changed properties`);
	}
}
