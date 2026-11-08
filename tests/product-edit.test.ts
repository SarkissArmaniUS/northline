import { describe, expect, it } from "vitest";
import { parseStockChanges, productEditSchema } from "@/server/modules/products/product.schema";

describe("parseStockChanges", () => {
    it("returns deltas only for changed sizes", () => {
        const values = { "stock:A-40": "12", "orig:A-40": "10", "stock:A-41": "5", "orig:A-41": "5", "stock:A-42": "0", "orig:A-42": "3" };
        expect(parseStockChanges(values)).toEqual([
            { sku: "A-40", delta: 2 },
            { sku: "A-42", delta: -3 },
        ]);
    });

    it("rejects invalid or missing values", () => {
        expect(parseStockChanges({ "stock:A-40": "-1", "orig:A-40": "5" })).toBeNull();
        expect(parseStockChanges({ "stock:A-40": "1.5", "orig:A-40": "5" })).toBeNull();
        expect(parseStockChanges({ "stock:A-40": "", "orig:A-40": "5" })).toBeNull();
        expect(parseStockChanges({ "stock:A-40": "5" })).toBeNull();
        expect(parseStockChanges({ "stock:A-40": "2000", "orig:A-40": "5" })).toBeNull();
    });
});

describe("productEditSchema", () => {
    const valid = {
        name: "Tempo 01",
        category: "running",
        price: "165.00",
        description: "Daily road trainer built for steady miles.",
        color: "Ink",
        image: "",
    };

    it("converts the price to cents", () => {
        const r = productEditSchema.safeParse(valid);
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.priceCents).toBe(16500);
    });

    it("rejects a bad price and an external image", () => {
        expect(productEditSchema.safeParse({ ...valid, price: "abc" }).success).toBe(false);
        expect(productEditSchema.safeParse({ ...valid, image: "https://evil.com/x.png" }).success).toBe(false);
    });
});