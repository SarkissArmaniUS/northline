import Link from "next/link";
import { z } from "zod";
import { formatPrice } from "@/components/shop/product-card";
import { requireAdmin } from "@/server/lib/require-admin";
import { listOrdersAdmin } from "@/server/modules/orders/order.service";
import { ORDER_STATUSES, type OrderStatus } from "@/server/modules/orders/status";
import { cancelOrderAction, shipOrderAction } from "./actions";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Orders" };

const statusSchema = z.enum(ORDER_STATUSES).optional().catch(undefined);
const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

const badge: Record<OrderStatus, string> = {
    pending: "border-line text-muted",
    paid: "border-ink bg-ink text-paper",
    shipped: "border-ink text-ink",
    cancelled: "border-line text-muted line-through",
    refunded: "border-accent text-accent",
};

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
    await requireAdmin();
    const sp = await searchParams;
    const status = statusSchema.parse(sp.status);
    const orders = await listOrdersAdmin(status);

    const tabs = [{ label: "All", value: undefined }, ...ORDER_STATUSES.map((s) => ({ label: s, value: s }))];

    return (
        <section>
            <h1 className="font-display text-4xl tracking-tight">Orders</h1>

            <nav aria-label="Filter by status" className="mt-6 flex flex-wrap gap-4 border-b border-line pb-3 text-sm capitalize">
                {tabs.map((t) => (
                    <Link
                        key={t.label}
                        href={t.value ? `/admin/orders?status=${t.value}` : "/admin/orders"}
                        className={t.value === status ? "text-ink underline underline-offset-8" : "text-muted hover:text-ink"}
                    >
                        {t.label}
                    </Link>
                ))}
            </nav>

            {orders.length === 0 ? (
                <p className="mt-10 text-muted">No orders found.</p>
            ) : (
                <div className="mt-6 overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                        <thead className="text-xs uppercase tracking-[0.15em] text-muted">
                        <tr className="border-b border-line">
                            <th className="py-3 pr-4 font-normal">Date</th>
                            <th className="py-3 pr-4 font-normal">Order</th>
                            <th className="py-3 pr-4 font-normal">Customer</th>
                            <th className="py-3 pr-4 font-normal">Items</th>
                            <th className="py-3 pr-4 text-right font-normal">Total</th>
                            <th className="py-3 pr-4 font-normal">Status</th>
                            <th className="py-3 font-normal">Action</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                        {orders.map((o) => (
                            <tr key={o.id} className="align-top">
                                <td className="py-4 pr-4 whitespace-nowrap">{dateFmt.format(new Date(o.createdAt))}</td>
                                <td className="py-4 pr-4 font-mono text-xs">#{o.id.slice(-6)}</td>
                                <td className="py-4 pr-4">
                                    {o.email ?? <span className="text-muted">No email yet</span>}
                                    {o.isGuest && <span className="ml-2 text-xs text-muted">guest</span>}
                                </td>
                                <td className="py-4 pr-4">
                                    {o.items.map((i) => (
                                        <div key={i.sku}>
                                            {i.name} / EU {i.size} × {i.qty}
                                        </div>
                                    ))}
                                </td>
                                <td className="py-4 pr-4 text-right whitespace-nowrap">{formatPrice(o.totalCents, o.currency)}</td>
                                <td className="py-4 pr-4">
                                        <span className={`inline-block border px-2 py-0.5 text-xs capitalize ${badge[o.status]}`}>
                                            {o.status}
                                        </span>
                                </td>
                                <td className="py-4">
                                    {o.status === "paid" && (
                                        <form action={shipOrderAction}>
                                            <input type="hidden" name="orderId" value={o.id} />
                                            <SubmitButton pendingLabel="Shipping..." className="underline underline-offset-4 hover:text-accent disabled:text-muted">
                                                Mark shipped
                                            </SubmitButton>
                                            {/*<button type="submit" className="underline underline-offset-4 hover:text-accent">*/}
                                            {/*    Mark shipped*/}
                                            {/*</button>*/}
                                        </form>
                                    )}
                                    {o.status === "pending" && (
                                        <form action={cancelOrderAction}>
                                            <input type="hidden" name="orderId" value={o.id} />
                                            <button type="submit" className="text-muted underline underline-offset-4 hover:text-accent">
                                                Cancel
                                            </button>
                                        </form>
                                    )}
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