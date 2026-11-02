"use client";

import { deleteProductAction } from "./actions";
import { SubmitButton } from "@/components/ui/submit-button";

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
    return (
        <form
            action={deleteProductAction}
            onSubmit={(e) => {
                if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) e.preventDefault();
            }}
        >
            <input type="hidden" name="productId" value={id} />
            <SubmitButton pendingLabel="Deleting..." className="text-accent underline underline-offset-4 disabled:text-muted">
                Delete
            </SubmitButton>
        </form>
    );
}