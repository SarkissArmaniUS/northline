"use client";

import { useActionState } from "react";
import type { EditableProduct } from "@/server/modules/products/product.admin";
import type { FormState } from "./actions";

const inputClass =
    "mt-2 w-full border border-line bg-transparent px-4 py-3 text-sm normal-case tracking-normal text-ink outline-none transition-colors focus:border-ink";
const labelClass = "block text-xs uppercase tracking-[0.2em] text-muted";

type Props = {
    product: EditableProduct;
    categories: string[];
    action: (prev: FormState, formData: FormData) => Promise<FormState>;
};

export function EditProductForm({ product, categories, action }: Props) {
    const [state, formAction, pending] = useActionState(action, undefined);
    const v = state?.values ?? {};

    return (
        <form action={formAction} className="mt-8 grid max-w-2xl gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
                <p className={labelClass}>Slug</p>
                <p className="mt-2 font-mono text-sm">{product.slug}</p>
                <p className="mt-1 text-xs text-muted">Slug and SKUs cannot be changed because orders and carts refer to them.</p>
            </div>

            <label className={`${labelClass} md:col-span-2`}>
                Name
                <input name="name" required maxLength={80} defaultValue={v.name ?? product.name} className={inputClass} />
            </label>

            <label className={labelClass}>
                Category
                <select name="category" required defaultValue={v.category ?? product.category} className={inputClass}>
                    {categories.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
            </label>

            <label className={labelClass}>
                Price (USD)
                <input
                    name="price"
                    required
                    inputMode="decimal"
                    defaultValue={v.price ?? (product.priceCents / 100).toFixed(2)}
                    className={inputClass}
                />
            </label>

            <label className={labelClass}>
                Color
                <input name="color" required maxLength={30} defaultValue={v.color ?? product.color} className={inputClass} />
            </label>

            <label className={labelClass}>
                Image path (optional)
                <input name="image" placeholder="/products/name.jpg" defaultValue={v.image ?? product.image} className={inputClass} />
            </label>

            <label className={`${labelClass} md:col-span-2`}>
                Description
                <textarea
                    name="description"
                    required
                    rows={4}
                    maxLength={500}
                    defaultValue={v.description ?? product.description}
                    className={inputClass}
                />
            </label>

            <fieldset className="md:col-span-2">
                <legend className={labelClass}>Stock per size</legend>
                <div className="mt-2 grid grid-cols-3 gap-4 sm:grid-cols-5">
                    {product.variants.map((variant) => (
                        <label key={variant.sku} className="block text-sm">
                            EU {variant.size}
                            <input type="hidden" name={`orig:${variant.sku}`} value={variant.stock} />
                            <input
                                name={`stock:${variant.sku}`}
                                type="number"
                                min={0}
                                max={1000}
                                required
                                defaultValue={v[`stock:${variant.sku}`] ?? variant.stock}
                                className={inputClass}
                            />
                        </label>
                    ))}
                </div>
            </fieldset>

            {state?.error && (
                <p role="alert" className="text-sm text-accent md:col-span-2">
                    {state.error}
                </p>
            )}

            <div className="md:col-span-2">
                <button
                    type="submit"
                    disabled={pending}
                    className="bg-ink px-8 py-4 text-sm text-paper transition-colors hover:bg-accent hover:text-ink disabled:cursor-wait disabled:bg-line disabled:text-muted"
                >
                    {pending ? "Saving..." : "Save changes"}
                </button>
            </div>
        </form>
    );
}