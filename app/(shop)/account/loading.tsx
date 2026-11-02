export default function Loading() {
    return (
        <section className="mx-auto max-w-7xl px-6 py-16" aria-busy="true" aria-label="Loading account">
            <div className="h-16 w-64 animate-pulse bg-paper-2" />
            <div className="mt-3 h-4 w-48 animate-pulse bg-paper-2" />
            <div className="mt-16 space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-20 animate-pulse bg-paper-2" />
                ))}
            </div>
        </section>
    );
}