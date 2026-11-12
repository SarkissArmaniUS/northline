import { closeDb, getDb, SEED_PRODUCTS } from "./helpers";

export default async function globalSetup() {
    const db = await getDb();

    // This is a test database (verified in getDb), so clear everything
    for (const name of ["products", "orders", "ratelimits", "user", "session", "account", "verification"]) {
        await db.collection(name).deleteMany({});
    }

    const now = new Date();
    await db.collection("products").insertMany(SEED_PRODUCTS.map((p) => ({ ...p, createdAt: now, updatedAt: now })));
    await closeDb()};
