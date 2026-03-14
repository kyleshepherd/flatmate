<script lang="ts">
	import { page } from "$app/stores";
	import { authClient } from "$lib/auth-client";

	const returnTo = $derived($page.url.searchParams.get("returnTo") ?? "/");

	function signInWithGoogle() {
		authClient.signIn.social({ provider: "google", callbackURL: returnTo });
	}
</script>

<div class="fixed inset-0 flex items-center justify-center overflow-hidden bg-background">
	<!-- Gradient orbs -->
	<div
		class="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full opacity-30 blur-[120px]"
		style:background="oklch(0.5 0.15 55)"
	></div>
	<div
		class="absolute -bottom-48 -right-24 h-[400px] w-[400px] rounded-full opacity-20 blur-[100px]"
		style:background="oklch(0.4 0.1 260)"
	></div>

	<div class="relative z-10 w-full max-w-sm px-6 text-center">
		<!-- Wordmark -->
		<div class="animate-fade-in-up mb-3">
			<span
				class="text-6xl font-extrabold tracking-tight"
				style:background="linear-gradient(135deg, oklch(0.85 0.14 60), oklch(0.7 0.18 45))"
				style:-webkit-background-clip="text"
				style:-webkit-text-fill-color="transparent"
				style:background-clip="text"
			>
				flatmate
			</span>
		</div>

		<p
			class="animate-fade-in-up text-base font-medium tracking-wide text-muted-foreground"
			style:animation-delay="0.1s"
		>
			Find your next home, together.
		</p>

		<!-- Sign in card -->
		<div
			class="animate-fade-in-up mt-10 rounded-2xl border border-border bg-card/60 p-8 backdrop-blur-xl"
			style:animation-delay="0.25s"
		>
			<button
				onclick={signInWithGoogle}
				class="group flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-zinc-800 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
			>
				<svg class="h-5 w-5" viewBox="0 0 24 24">
					<path
						d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
						fill="#4285F4"
					/>
					<path
						d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
						fill="#34A853"
					/>
					<path
						d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
						fill="#FBBC05"
					/>
					<path
						d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
						fill="#EA4335"
					/>
				</svg>
				Continue with Google
			</button>
		</div>

		<p class="animate-fade-in mt-8 text-xs text-muted-foreground/70" style:animation-delay="0.4s">
			Sign in to create searches, invite flatmates, and track properties.
		</p>
	</div>
</div>
