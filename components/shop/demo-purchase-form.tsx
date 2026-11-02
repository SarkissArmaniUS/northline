"use client";

import { useEffect, useState } from "react";

export function DemoPurchaseForm() {
    const [pending, setPending] = useState(false);

    // Якщо користувач повернувся зі сторінки Stripe кнопкою "Назад", скидаємо стан
    useEffect(() => {
        const reset = () => setPending(false);
        window.addEventListener("pageshow", reset);
        return () => window.removeEventListener("pageshow", reset);
    }, []);

    return (
        <form method="post" action="/api/demo-checkout" onSubmit={() => setPending(true)}>
            <button
                type="submit"
                disabled={pending}
                className="bg-ink px-4 py-1.5 text-paper transition-colors hover:bg-accent hover:text-ink disabled:cursor-wait disabled:bg-line disabled:text-muted"
            >
                {pending ? "Opening Stripe..." : "Try a test purchase"}
            </button>
        </form>
    );
}