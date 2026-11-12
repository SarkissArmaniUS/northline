import { expect, test, type APIRequestContext, type APIResponse } from "@playwright/test";
import { HAS_STRIPE, getStock, latestOrder, setStock, uniqueIp, waitForFreshMinute } from "../helpers";

const post = (request: APIRequestContext, items: unknown[], ip = uniqueIp()) =>
    request.post("/api/checkout", { headers: { "x-forwarded-for": ip }, data: { items } });

test.describe("POST /api/checkout", () => {
    test("rejects an empty cart", async ({ request }) => {
        expect((await post(request, [])).status()).toBe(400);
    });

    test("rejects an invalid quantity", async ({ request }) => {
        expect((await post(request, [{ sku: "E2E-RUN-42", qty: 11 }])).status()).toBe(400);
        expect((await post(request, [{ sku: "E2E-RUN-42", qty: 0 }])).status()).toBe(400);
    });

    test("rejects an unknown sku", async ({ request }) => {
        const res = await post(request, [{ sku: "NOPE-1", qty: 1 }]);
        expect(res.status()).toBe(400);
        expect((await res.json()).error).toContain("Unknown item");
    });

    test("returns 409 when there is not enough stock", async ({ request }) => {
        await setStock("E2E-LIFE-43", 0);
        try {
            const res = await post(request, [{ sku: "E2E-LIFE-43", qty: 1 }]);
            expect(res.status()).toBe(409);
            expect((await res.json()).error).toContain("Not enough stock");
        } finally {
            await setStock("E2E-LIFE-43", 10);
        }
    });

    test("limits the number of requests per client", async ({ request }) => {
        await waitForFreshMinute();
        const ip = uniqueIp();
        const statuses: number[] = [];
        let last: APIResponse | undefined;

        for (let i = 0; i < 11; i++) {
            last = await post(request, [], ip);
            statuses.push(last.status());
        }

        expect(statuses.slice(0, 10)).toEqual(Array(10).fill(400));
        expect(statuses[10]).toBe(429);
        expect(last?.headers()["retry-after"]).toBeDefined();
    });
});

test.describe("with a Stripe test key", () => {
    test.skip(!HAS_STRIPE, "needs STRIPE_SECRET_KEY in .env.test");

    test("ignores prices sent by the client", async ({ request }) => {
        const res = await post(request, [{ sku: "E2E-RUN-42", qty: 1, priceCents: 1, unitPriceCents: 1 }]);
        expect(res.status()).toBe(200);
        expect((await res.json()).url).toMatch(/^https:\/\/checkout\.stripe\.com\//);

        const order = await latestOrder();
        expect(order?.totalCents).toBe(12000);
        expect(order?.status).toBe("pending");
    });

    test("sells the last pair only once", async ({ request }) => {
        await setStock("E2E-LIFE-41", 1);
        try {
            const [a, b] = await Promise.all([
                post(request, [{ sku: "E2E-LIFE-41", qty: 1 }]),
                post(request, [{ sku: "E2E-LIFE-41", qty: 1 }]),
            ]);
            expect([a.status(), b.status()].sort((x, y) => x - y)).toEqual([200, 409]);
            expect(await getStock("E2E-LIFE-41")).toBe(0);
        } finally {
            await setStock("E2E-LIFE-41", 10);
        }
    });
});