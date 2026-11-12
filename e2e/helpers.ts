import { MongoClient, ObjectId } from "mongodb";
import Stripe from "stripe";

export const WEBHOOK_SECRET = "whsec_e2e_test_secret";
export const AUTH_SECRET = "e2e-secret-e2e-secret-e2e-secret-0123";
export const HAS_STRIPE = /^sk_test_[A-Za-z0-9]{20,}$/.test(process.env.STRIPE_SECRET_KEY ?? "");

// ---------- Data base ----------
let client: MongoClient | undefined;

export async function getDb() {
    const uri = process.env.MONGODB_URI_TEST;
    if (!uri) throw new Error("MONGODB_URI_TEST is not set. Add it to .env.test.");
    client ??= new MongoClient(uri);
    const db = client.db();
    if (!db.databaseName.toLowerCase().includes("test")) {
        throw new Error(`Refusing to run E2E tests against "${db.databaseName}": the database name must contain "test".`);
    }
    return db;
}

export async function closeDb() {
    await client?.close();
    client = undefined;
}

const SIZES = [41, 42, 43];
const variants = (prefix: string, color: string) =>
    SIZES.map((size) => ({ sku: `${prefix}-${size}`, color, size, stock: 10 }));

export const SEED_PRODUCTS = [
    {
        slug: "e2e-runner",
        name: "E2E Runner",
        category: "running",
        description: "Test product for end to end checks.",
        priceCents: 12000,
        currency: "usd",
        images: [] as string[],
        isActive: true,
        variants: variants("E2E-RUN", "Ink"),
    },
    {
        slug: "e2e-lifestyle",
        name: "E2E Lifestyle",
        category: "lifestyle",
        description: "Second test product for filters and stock checks.",
        priceCents: 9000,
        currency: "usd",
        images: [] as string[],
        isActive: true,
        variants: variants("E2E-LIFE", "Sand"),
    },
];

export async function createPendingOrder(sku = "E2E-RUN-42", qty = 1) {
    const db = await getDb();
    const unitPriceCents = 12000;
    const totalCents = unitPriceCents * qty;
    const now = new Date();
    const res = await db.collection("orders").insertOne({
        items: [{ sku, slug: "e2e-runner", name: "E2E Runner", size: 42, unitPriceCents, qty }],
        totalCents,
        currency: "usd",
        status: "pending",
        expiresAt: new Date(now.getTime() + 31 * 60 * 1000),
        createdAt: now,
        updatedAt: now,
    });
    return { id: res.insertedId.toString(), totalCents };
}

export async function getOrder(id: string) {
    return (await getDb()).collection("orders").findOne({ _id: new ObjectId(id) });
}

export async function latestOrder() {
    return (await getDb()).collection("orders").find().sort({ _id: -1 }).limit(1).next();
}

export async function getStock(sku: string) {
    const product = await (await getDb()).collection("products").findOne({ "variants.sku": sku });
    return product?.variants.find((v: { sku: string }) => v.sku === sku)?.stock as number | undefined;
}

export async function setStock(sku: string, stock: number) {
    await (await getDb()).collection("products").updateOne({ "variants.sku": sku }, { $set: { "variants.$.stock": stock } });
}

// ---------- Signed Stripe events ----------
const stripeForSigning = new Stripe("sk_test_dummy");

export function signedEvent(type: string, object: Record<string, unknown>) {
    const payload = JSON.stringify({ id: `evt_e2e_${Date.now()}`, object: "event", type, data: { object } });
    const header = stripeForSigning.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
    return { payload, header };
}

// ---------- Network ----------
// Ліміт запитів рахується за IP із x-forwarded-for, тож кожен тест бере свій
export function uniqueIp() {
    const r = () => Math.floor(Math.random() * 250) + 1;
    return `10.${r()}.${r()}.${r()}`;
}

// The rate limit counter resets on a minute boundary, so avoid starting near the end of a minute
export async function waitForFreshMinute() {
    const s = new Date().getSeconds();
    if (s >= 50) await new Promise((resolve) => setTimeout(resolve, (61 - s) * 1000));
}