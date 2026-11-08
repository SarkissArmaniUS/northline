import mongoose from "mongoose";
import { connectDB } from "../../lib/db";
import { Order } from "../orders/order.model";
import { Product, type Category } from "./product.model";
import type { ProductEditData, ProductFormData } from "./product.schema";

export type AdminProduct = {
    id: string;
    slug: string;
    name: string;
    category: Category;
    priceCents: number;
    currency: string;
    isActive: boolean;
    variants: { sku: string; size: number; stock: number }[];
    totalStock: number;
};

export async function listProductsAdmin(): Promise<AdminProduct[]> {
    await connectDB();
    const docs = await Product.find({}).sort({ createdAt: -1 }).lean();

    return docs.map((d) => ({
        id: String(d._id),
        slug: d.slug,
        name: d.name,
        category: d.category as Category,
        priceCents: d.priceCents,
        currency: d.currency,
        isActive: d.isActive,
        variants: d.variants.map((v) => ({ sku: v.sku, size: v.size, stock: v.stock })),
        totalStock: d.variants.reduce((sum, v) => sum + v.stock, 0),
    }));
}

export async function createProduct(input: ProductFormData) {
    await connectDB();
    await Product.create({
        slug: input.slug,
        name: input.name,
        category: input.category,
        description: input.description,
        priceCents: input.priceCents,
        currency: "usd",
        images: input.image ? [input.image] : [],
        // SKU будується зі slug, який унікальний, тому SKU теж унікальні
        variants: input.sizes.map((size) => ({
            sku: `${input.slug}-${size}`.toUpperCase(),
            color: input.color,
            size,
            stock: input.stock,
        })),
        isActive: true,
    });
}

export async function setProductActive(id: string, active: boolean) {
    await connectDB();
    await Product.updateOne({ _id: id }, { isActive: active });
}

export type DeleteResult = "deleted" | "not_found" | "has_pending_orders";

export async function deleteProduct(id: string): Promise<DeleteResult> {
    await connectDB();
    const product = await Product.findById(id).lean();
    if (!product) return "not_found";

    // Не видаляємо, поки хтось може оплачувати це замовлення в Stripe
    const pending = await Order.countDocuments({ status: "pending", "items.slug": product.slug });
    if (pending > 0) return "has_pending_orders";

    await Product.deleteOne({ _id: id });
    return "deleted";
}

export type EditableProduct = {
    id: string;
    slug: string;
    name: string;
    category: Category;
    description: string;
    priceCents: number;
    color: string;
    image: string;
    variants: { sku: string; size: number; stock: number }[];
};

export async function getProductForEdit(id: string): Promise<EditableProduct | null> {
    await connectDB();
    const d = await Product.findById(id).lean();
    if (!d) return null;

    return {
        id: String(d._id),
        slug: d.slug,
        name: d.name,
        category: d.category as Category,
        description: d.description,
        priceCents: d.priceCents,
        color: d.variants[0]?.color ?? "",
        image: d.images[0] ?? "",
        variants: d.variants.map((v) => ({ sku: v.sku, size: v.size, stock: v.stock })),
    };
}

class StockConflictError extends Error {}

export type UpdateResult = "updated" | "not_found" | "stock_conflict";

export async function updateProduct(
    id: string,
    input: ProductEditData,
    stockChanges: { sku: string; delta: number }[],
): Promise<UpdateResult> {
    await connectDB();
    const session = await mongoose.startSession();
    let found = true;

    try {
        await session.withTransaction(async () => {
            const res = await Product.updateOne(
                { _id: id },
                {
                    $set: {
                        name: input.name,
                        category: input.category,
                        description: input.description,
                        priceCents: input.priceCents,
                        images: input.image ? [input.image] : [],
                        "variants.$[].color": input.color,
                    },
                },
                { session },
            );
            if (res.matchedCount !== 1) {
                found = false;
                return;
            }

            for (const c of stockChanges) {
                // Зменшення дозволене, лише якщо залишку вистачає, тож він не піде нижче нуля
                const r = await Product.updateOne(
                    { _id: id, variants: { $elemMatch: { sku: c.sku, stock: { $gte: Math.max(0, -c.delta) } } } },
                    { $inc: { "variants.$.stock": c.delta } },
                    { session },
                );
                if (r.modifiedCount !== 1) throw new StockConflictError();
            }
        });
        return found ? "updated" : "not_found";
    } catch (e) {
        if (e instanceof StockConflictError) return "stock_conflict";
        throw e;
    } finally {
        await session.endSession();
    }
}