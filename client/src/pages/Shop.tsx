import PublicLayout from "@/components/PublicLayout";
import { getPublicSectionDefault } from "@/data/publicContentDefaults";
import { usePublicSection } from "@/hooks/usePublicSection";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Boxes, Filter, Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

type SortOption = "newest" | "price-low" | "price-high" | "title";

function money(value: string | number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(Number(value));
}

export default function Shop() {
  const { data: products = [], isLoading, error } = trpc.portal.products.listPublished.useQuery();
  const hero = usePublicSection("shop", "hero", getPublicSectionDefault("shop", "hero"));
  const catalogue = usePublicSection("shop", "catalogue", getPublicSectionDefault("shop", "catalogue"));
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>("newest");

  const categories = useMemo(
    () => Array.from(new Set(products.map(product => product.category))).sort((a, b) => a.localeCompare(b)),
    [products],
  );
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...products]
      .filter(product => {
        const matchesSearch = !query || `${product.title} ${product.category} ${product.summary} ${product.description ?? ""}`.toLowerCase().includes(query);
        return matchesSearch && (selectedCategories.length === 0 || selectedCategories.includes(product.category));
      })
      .sort((a, b) => {
        if (sort === "price-low") return Number(a.price) - Number(b.price);
        if (sort === "price-high") return Number(b.price) - Number(a.price);
        if (sort === "title") return a.title.localeCompare(b.title);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [products, search, selectedCategories, sort]);

  const clearFilters = () => {
    setSearch("");
    setSelectedCategories([]);
    setSort("newest");
  };
  const toggleCategory = (category: string) => {
    setSelectedCategories(current => current.includes(category) ? current.filter(item => item !== category) : [...current, category]);
  };

  return (
    <PublicLayout>
      <main className="bg-[#FFF4E1]">
        {hero.isVisible && (
          <section className="hero-grid relative isolate overflow-hidden bg-[#1A312C] text-[#FFF4E1]">
            <div className="hero-orb absolute -right-44 -top-28 size-[34rem] opacity-70" />
            <div className="site-container relative grid gap-10 py-16 sm:py-20 lg:grid-cols-[1.05fr_.95fr] lg:items-end lg:py-24">
              <div className="max-w-2xl">
                <p className="font-mono text-[.65rem] uppercase tracking-[.15em] text-[#89D7B7]">{hero.eyebrow || "Digital Junction products"}</p>
                <h1 className="display mt-5 whitespace-pre-line text-5xl leading-[.95] sm:text-6xl">{hero.title}</h1>
                <p className="mt-6 max-w-xl whitespace-pre-line text-base leading-7 text-[#FFF4E1]/72">{hero.body}</p>
                <div className="mt-9 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setSelectedCategories([])} className={`rounded-full px-4 py-2 text-xs font-bold transition ${selectedCategories.length === 0 ? "bg-[#89D7B7] text-[#1A312C]" : "border border-[#FFF4E1]/20 bg-[#FFF4E1]/7 text-[#FFF4E1] hover:bg-[#FFF4E1]/14"}`}>All products</button>
                  {categories.slice(0, 4).map(category => <button type="button" key={category} onClick={() => setSelectedCategories([category])} className={`rounded-full px-4 py-2 text-xs font-bold transition ${selectedCategories.length === 1 && selectedCategories[0] === category ? "bg-[#89D7B7] text-[#1A312C]" : "border border-[#FFF4E1]/20 bg-[#FFF4E1]/7 text-[#FFF4E1] hover:bg-[#FFF4E1]/14"}`}>{category}</button>)}
                </div>
              </div>
              <aside className="rounded-[1.55rem] border border-[#89D7B7]/28 bg-[#FFF4E1]/7 p-5 backdrop-blur-sm sm:p-6">
                <span className="grid size-11 place-items-center rounded-xl bg-[#89D7B7] text-[#1A312C]"><Boxes className="size-5" /></span>
                <p className="mt-8 font-mono text-[.6rem] uppercase tracking-[.12em] text-[#89D7B7]">Owner-managed catalogue</p>
                <p className="mt-3 text-lg font-semibold leading-7">Every product is created and maintained directly by Digital Junction.</p>
                <div className="mt-7 border-t border-[#FFF4E1]/15 pt-4"><p className="font-mono text-[.55rem] uppercase tracking-[.1em] text-[#FFF4E1]/52">Published products</p><p className="mt-2 text-3xl font-bold text-[#89D7B7]">{isLoading ? "—" : products.length}</p></div>
              </aside>
            </div>
          </section>
        )}

        {catalogue.isVisible && (
          <section className="section-grid py-16 sm:py-20">
            <div className="site-container">
              <div className="flex flex-col gap-6 border-b border-[#1A312C]/12 pb-8 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl"><p className="eyebrow">{catalogue.eyebrow || "Catalogue"}</p><h2 className="display mt-4 text-4xl text-[#1A312C] sm:text-5xl">{catalogue.title}</h2>{catalogue.body ? <p className="mt-4 whitespace-pre-line text-sm leading-6 text-[#1A312C]/65">{catalogue.body}</p> : null}</div>
                <p className="rounded-full border border-[#428475]/25 bg-[#89D7B7]/25 px-3 py-2 font-mono text-[.58rem] uppercase tracking-[.1em] text-[#1A312C]/70">{isLoading ? "Loading catalogue" : `${filteredProducts.length} live ${filteredProducts.length === 1 ? "product" : "products"}`}</p>
              </div>

              <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <label className="relative block w-full max-w-md"><Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#428475]" /><input value={search} onChange={event => setSearch(event.target.value)} className="form-field !border-[#1A312C]/18 !bg-[#FFF4E1] !pl-11 text-sm shadow-[0_8px_20px_rgba(26,49,44,.04)]" placeholder="Search products" /></label>
                <label className="flex items-center gap-3 self-end text-xs font-semibold text-[#1A312C]/65 lg:self-auto">Sort by <select value={sort} onChange={event => setSort(event.target.value as SortOption)} className="rounded-lg border border-[#1A312C]/15 bg-[#89D7B7]/22 px-3 py-2 font-semibold text-[#1A312C] outline-none focus-visible:ring-2 focus-visible:ring-[#428475]"><option value="newest">Newest first</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="title">Name: A–Z</option></select></label>
              </div>

              <div className="mt-7 grid gap-6 lg:grid-cols-[13rem_1fr]">
                <aside className="h-fit rounded-[1.2rem] bg-[#1A312C] p-5 text-[#FFF4E1] lg:sticky lg:top-24"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-bold"><Filter className="size-4 text-[#89D7B7]" />Filter</span>{(search || selectedCategories.length || sort !== "newest") ? <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-[.65rem] font-bold text-[#89D7B7] hover:text-[#FFF4E1]"><X className="size-3" />Clear</button> : null}</div><p className="mt-7 font-mono text-[.55rem] uppercase tracking-[.11em] text-[#FFF4E1]/46">Product category</p><div className="mt-4 grid gap-3">{categories.length ? categories.map(category => <label key={category} className="flex cursor-pointer items-center gap-2.5 text-xs leading-5 text-[#FFF4E1]/77"><input checked={selectedCategories.includes(category)} onChange={() => toggleCategory(category)} type="checkbox" className="size-3.5 accent-[#89D7B7]" />{category}</label>) : <p className="text-xs leading-5 text-[#FFF4E1]/58">Categories will appear when a product is published.</p>}</div><div className="mt-8 rounded-xl bg-[#428475] p-3.5"><SlidersHorizontal className="size-4 text-[#89D7B7]" /><p className="mt-3 text-[.68rem] leading-5 text-[#FFF4E1]/80">Use the filters to find the right Digital Junction product.</p></div></aside>
                <section>{isLoading ? <div className="grid min-h-80 place-items-center rounded-[1.25rem] border border-[#428475]/16 bg-[#89D7B7]/15"><Loader2 className="size-7 animate-spin text-[#428475]" /></div> : error ? <div className="rounded-[1.25rem] border border-dashed border-[#1A312C]/22 bg-[#89D7B7]/14 p-10 text-center"><h2 className="display text-3xl text-[#1A312C]">The catalogue needs a moment.</h2><p className="mt-3 text-sm text-[#1A312C]/60">Please refresh and try again.</p></div> : filteredProducts.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{filteredProducts.map(product => <article key={product.id} className="group overflow-hidden rounded-[1.25rem] border border-[#1A312C]/14 bg-[#FFF4E1] shadow-[0_12px_28px_rgba(26,49,44,.055)] transition duration-200 hover:-translate-y-1 hover:border-[#428475]/55 hover:shadow-[0_20px_36px_rgba(26,49,44,.12)]">{product.coverImageUrl ? <Link href={`/shop/${product.slug}`} className="block aspect-[1.25] overflow-hidden bg-[#89D7B7]/18"><img src={product.coverImageUrl} alt={product.title} className="size-full object-cover transition duration-300 group-hover:scale-[1.035]" /></Link> : <Link href={`/shop/${product.slug}`} className="relative block aspect-[1.25] overflow-hidden bg-[linear-gradient(135deg,#1A312C,#428475)]"><span className="absolute left-4 top-4 rounded-full bg-[#FFF4E1]/12 px-2.5 py-1 font-mono text-[.52rem] uppercase tracking-[.1em] text-[#FFF4E1]">{product.category}</span></Link>}<div className="p-5"><p className="font-mono text-[.55rem] uppercase tracking-[.1em] text-[#428475]">{product.category}</p><h3 className="mt-3 text-base font-bold leading-6 text-[#1A312C]">{product.title}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-[#1A312C]/60">{product.summary}</p><div className="mt-6 grid gap-3 border-t border-[#1A312C]/10 pt-4"><div className="flex items-end justify-between gap-3"><div><p className="font-mono text-[.5rem] uppercase tracking-[.08em] text-[#1A312C]/45">Price</p><p className="mt-1 font-mono text-base font-bold text-[#1A312C]">{money(product.price)}</p></div><Link href={`/shop/${product.slug}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#428475] px-3 py-2 text-xs font-bold text-[#FFF4E1] transition hover:bg-[#1A312C]">Purchase Here<ArrowRight className="size-3.5" /></Link></div></div></div></article>)}</div> : <div className="rounded-[1.25rem] border border-dashed border-[#428475]/35 bg-[#89D7B7]/16 px-7 py-16 text-center"><p className="eyebrow">{products.length ? "No matches" : "Digital products"}</p><h2 className="display mt-3 text-3xl text-[#1A312C]">{products.length ? "No products match those filters." : "No products are published yet."}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#1A312C]/62">{products.length ? "Try another category or clear your search." : "Published Digital Junction products will appear here."}</p>{products.length ? <button type="button" onClick={clearFilters} className="button-primary mt-6">Clear filters</button> : null}</div>}</section>
              </div>
            </div>
          </section>
        )}
      </main>
    </PublicLayout>
  );
}
