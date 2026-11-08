import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/lib/require-admin";
import { getProductForEdit } from "@/server/modules/products/product.admin";
import { CATEGORIES } from "@/server/modules/products/product.model";
import { updateProductAction } from "../../actions";
import { EditProductForm } from "../../edit-product-form";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]/edit">) {
    await requireAdmin();
    const { id } = await params;
    if (!/^[a-f\d]{24}$/i.test(id)) notFound();

    const product = await getProductForEdit(id);
    if (!product) notFound();

    return (
        <section>
            <Link href="/admin/products" className="text-sm text-muted underline underline-offset-4 hover:text-ink">
                Back to products
            </Link>
            <h1 className="mt-4 font-display text-5xl">Edit {product.name}</h1>
            <EditProductForm product={product} categories={[...CATEGORIES]} action={updateProductAction.bind(null, id)} />
        </section>
    );
}