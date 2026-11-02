export default function Loading() {
    return (
        <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-2" aria-busy="true" aria-label="Loading product">
    <div className="aspect-[4/5] w-full animate-pulse bg-paper-2" />
    <div className="space-y-6 md:pt-8">
    <div className="h-4 w-24 animate-pulse bg-paper-2" />
    <div className="h-16 w-3/4 animate-pulse bg-paper-2" />
    <div className="h-6 w-20 animate-pulse bg-paper-2" />
    <div className="space-y-2">
    <div className="h-4 w-full max-w-md animate-pulse bg-paper-2" />
    <div className="h-4 w-2/3 animate-pulse bg-paper-2" />
        </div>
        <div className="grid grid-cols-5 gap-2 pt-6">
        {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse bg-paper-2" />
))}
    </div>
    <div className="h-14 w-full animate-pulse bg-paper-2" />
        </div>
        </section>
);
}