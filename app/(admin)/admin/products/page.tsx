import Link from "next/link";
import { z } from "zod";
import { formatPrice } from "@/components/shop/product-card";
import { requireAdmin } from "@/server/lib/require-admin";
import { listProductsAdmin } from "@/server/modules/products/product.admin";
import { toggleProductAction } from "./actions";
import { DeleteProductButton } from "./delete-product-button";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Products" };

const NOTICES = {
    created: "Product created.",
    updated: "Product updated.",
    deleted: "Product deleted.",
    "has-pending-orders":
        "Cannot delete: there are orders awaiting payment for this product. Disable it instead, or try again after they expire.",
    "not-found": "Product not found.",
} as const;

const noticeSchema = z
    .enum(["created", "updated", "deleted", "has-pending-orders", "not-found"])
    .optional()
    .catch(undefined);

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
    await requireAdmin();
    const sp = await searchParams;
    const notice = noticeSchema.parse(sp.notice);
    const products = await listProductsAdmin();

    return (
        <section>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="font-display text-4xl tracking-tight">Products</h1>
                <Link href="/admin/products/new" className="bg-ink px-5 py-3 text-sm text-paper transition-colors hover:bg-accent">
                    New product
                </Link>
            </div>

            {notice && (
                <p role="status" className="mt-6 border border-line bg-paper-2 px-4 py-3 text-sm">
                    {NOTICES[notice]}
                </p>
            )}

            {products.length === 0 ? (
                <p className="mt-10 text-muted">No products yet.</p>
            ) : (
                <div className="mt-6 overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                        <thead className="text-xs uppercase tracking-[0.15em] text-muted">
                        <tr className="border-b border-line">
                            <th className="py-3 pr-4 font-normal">Product</th>
                            <th className="py-3 pr-4 font-normal">Category</th>
                            <th className="py-3 pr-4 text-right font-normal">Price</th>
                            <th className="py-3 pr-4 font-normal">Stock</th>
                            <th className="py-3 pr-4 font-normal">Status</th>
                            <th className="py-3 font-normal">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                        {products.map((p) => (
                            <tr key={p.id} className="align-top">
                                <td className="py-4 pr-4">
                                    {p.isActive ? (
                                        <Link href={`/products/${p.slug}`} className="underline underline-offset-4 hover:text-accent">
                                            {p.name}
                                        </Link>
                                    ) : (
                                        <span className="text-muted">{p.name}</span>
                                    )}
                                    <div className="font-mono text-xs text-muted">{p.slug}</div>
                                </td>
                                <td className="py-4 pr-4 capitalize">{p.category}</td>
                                <td className="py-4 pr-4 text-right whitespace-nowrap">{formatPrice(p.priceCents, p.currency)}</td>
                                <td className="py-4 pr-4">
                                    <div>{p.totalStock} total</div>
                                    <div className="text-xs text-muted">
                                        {p.variants.map((v) => `${v.size}: ${v.stock}`).join(" · ")}
                                    </div>
                                </td>
                                <td className="py-4 pr-4">
                                        <span
                                            className={`inline-block border px-2 py-0.5 text-xs ${
                                                p.isActive ? "border-ink text-ink" : "border-line text-muted"
                                            }`}
                                        >
                                            {p.isActive ? "Active" : "Disabled"}
                                        </span>
                                </td>
                                <td className="py-4">
                                    <div className="flex items-center gap-4">
                                        <Link href={`/admin/products/${p.id}/edit`} className="underline underline-offset-4 hover:text-accent">
                                            Edit
                                        </Link>
                                        <form action={toggleProductAction}>
                                            <input type="hidden" name="productId" value={p.id} />
                                            <input type="hidden" name="active" value={p.isActive ? "0" : "1"} />
                                            <SubmitButton pendingLabel="Saving..." className="underline underline-offset-4 hover:text-accent disabled:text-muted">
                                                {p.isActive ? "Disable" : "Enable"}
                                            </SubmitButton>
                                        </form>
                                        <DeleteProductButton id={p.id} name={p.name} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}