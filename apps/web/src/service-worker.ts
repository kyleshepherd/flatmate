/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

self.addEventListener("push", (event) => {
	if (!event.data) return;

	const data = event.data.json();
	event.waitUntil(
		self.registration.showNotification(data.title ?? "Flatmate", {
			body: data.body,
			icon: "/icon-192.png",
			badge: "/icon-192.png",
			data: { url: data.url },
		}),
	);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const url = event.notification.data?.url ?? "/";
	event.waitUntil(self.clients.openWindow(url));
});
