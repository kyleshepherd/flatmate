import { createDb } from "@flatmate/db";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	throw new Error("DATABASE_URL is required");
}

const db = createDb(DATABASE_URL);

async function main() {
	console.log("Scraper starting...");
	// Placeholder — replaced in Task 12
	console.log("Scraper done.");
}

main().catch(console.error);
