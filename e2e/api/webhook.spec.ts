import { expect, test } from "@playwright/test";
import { createPendingOrder, getOrder, getStock, setStock, signedEvent } from "../helpers";

const URL = "/api/webhooks/stripe";
const headers = (signature?: string) => ({
    "content-type": "application/json",
    ...(signature ? { "stripe-signature": signature } : {}),
});

function paidSession(orderId: string, amount: number) {
    return {
        metadata: { orderId },
        payment_status: "paid",
        amount_total: amount,
        currency: "usd",
        payment_intent: "pi_e2e_1",
        customer_details: { email: "buyer@example.com" },
    };
}

test.describe("Stripe webhook", () => {
    test("rejects a request without a signature", async ({ request }) => {
        const res = await request.post(URL, { data: "{}", headers: headers() });
        expect(res.status()).toBe(400);
    });

    test("rejects an invalid signature", async ({ request }) => {
        const { payload } = signedEvent("checkout.session.completed", {});
        const res = await request.post(URL, { data: payload, headers: headers("t=1,v1=deadbeef") });
        expect(res.status()).toBe(400);
    });

    test("marks a pending order as paid, and a replay changes nothing", async ({ request }) => {
        const order = await createPendingOrder();
        const { payload, header } = signedEvent("checkout.session.completed", paidSession(order.id, order.totalCents));

        const first = await request.post(URL, { data: payload, headers: headers(header) });
        expect(first.status()).toBe(200);
        const afterFirst = await getOrder(order.id);
        expect(afterFirst).toMatchObject({
            status: "paid",
            stripePaymentIntentId: "pi_e2e_1",
            email: "buyer@example.com",
        });

        const replay = await request.post(URL, { data: payload, headers: headers(header) });
        expect(replay.status()).toBe(200);
        const afterReplay = await getOrder(order.id);
        expect(afterReplay?.status).toBe("paid");
        expect(afterReplay?.updatedAt).toEqual(afterFirst?.updatedAt);
    });

    test("does not mark an order as paid when the amount differs", async ({ request }) => {
        const order = await createPendingOrder();
        const { payload, header } = signedEvent("checkout.session.completed", paidSession(order.id, 1));

        const res = await request.post(URL, { data: payload, headers: headers(header) });
        expect(res.status()).toBe(200);
        expect((await getOrder(order.id))?.status).toBe("pending");
    });

    test("cancels an expired session and returns the reserved stock", async ({ request }) => {
        await setStock("E2E-RUN-42", 9); // one pair of shoes was reserved
        const order = await createPendingOrder("E2E-RUN-42", 1);
        const { payload, header } = signedEvent("checkout.session.expired", { metadata: { orderId: order.id } });

        const res = await request.post(URL, { data: payload, headers: headers(header) });
        expect(res.status()).toBe(200);
        expect((await getOrder(order.id))?.status).toBe("cancelled");
        expect(await getStock("E2E-RUN-42")).toBe(10);
    });
});