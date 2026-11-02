export default function Loading() {
    return (
        <section aria-busy="true" aria-label="Loading">
            <div className="h-10 w-48 animate-pulse bg-paper-2" />
            <div className="mt-8 space-y-px">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse bg-paper-2" />
                ))}
            </div>
        </section>
    );
}