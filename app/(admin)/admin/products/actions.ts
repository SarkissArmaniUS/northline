"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/server/lib/require-admin";
import {
    createProduct,
    deleteProduct,
    setProductActive,
    updateProduct,
} from "@/server/modules/products/product.admin";
import { parseStockChanges, productEditSchema, productFormSchema } from "@/server/modules/products/product.schema";

export type FormState = { error?: string; values?: Record<string, string> } | undefined;

const idSchema = z.string().regex(/^[a-f\d]{24}$/i);

function refreshProductPages() {
    revalidatePath("/admin/products");
    revalidatePath("/products");
    revalidatePath("/products/[slug]", "page");
}

function formValues(formData: FormData): Record<string, string> {
    return Object.fromEntries(
        [...formData].filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
}

export async function createProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
    await requireAdmin(); // серверні дії це публічні ендпоінти, тому роль перевіряємо в кожній

    const values = formValues(formData);
    const parsed = productFormSchema.safeParse(values);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid data", values };
    }

    try {
        await createProduct(parsed.data);
    } catch (e) {
        if ((e as { code?: number }).code === 11000) {
            return { error: "A product with this slug already exists.", values };
        }
        console.error("Create product failed", e);
        return { error: "Could not create the product. Please try again.", values };
    }

    refreshProductPages();
    redirect("/admin/products?notice=created"); // redirect кидає виняток, тому стоїть поза try/catch
}

export async function updateProductAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
    await requireAdmin();
    if (!idSchema.safeParse(id).success) return { error: "Invalid product." };

    const values = formValues(formData);
    const parsed = productEditSchema.safeParse(values);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid data", values };
    }

    const changes = parseStockChanges(values);
    if (!changes) return { error: "Stock must be a whole number from 0 to 1000.", values };

    let result;
    try {
        result = await updateProduct(id, parsed.data, changes);
    } catch (e) {
        console.error("Update product failed", e);
        return { error: "Could not save the changes. Please try again.", values };
    }

    if (result === "not_found") return { error: "Product not found.", values };
    if (result === "stock_conflict") {
        return { error: "Stock changed while you were editing, for example because of a purchase. Reload the page and try again.", values };
    }

    refreshProductPages();
    redirect("/admin/products?notice=updated");
}

export async function toggleProductAction(formData: FormData) {
    await requireAdmin();
    const id = idSchema.safeParse(formData.get("productId"));
    const active = z.enum(["0", "1"]).safeParse(formData.get("active"));
    if (!id.success || !active.success) return;

    await setProductActive(id.data, active.data === "1");
    refreshProductPages();
}

export async function deleteProductAction(formData: FormData) {
    await requireAdmin();
    const id = idSchema.safeParse(formData.get("productId"));
    if (!id.success) return;

    const result = await deleteProduct(id.data);
    refreshProductPages();

    const notice =
        result === "deleted" ? "deleted" : result === "has_pending_orders" ? "has-pending-orders" : "not-found";
    redirect(`/admin/products?notice=${notice}`);
}