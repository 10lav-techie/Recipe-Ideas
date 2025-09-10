import React, { useEffect, useMemo, useRef, useState } from "react";

const THEMEAL_BASE = "https://www.themealdb.com/api/json/v1/1";

export default function App() {
  // Search & filters
  const [mode, setMode] = useState("ingredient"); // "ingredient"
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [area, setArea] = useState("");

  // Data
  const [meals, setMeals] = useState([]); // list results (idMeal, strMeal, strMealThumb)
  const [categories, setCategories] = useState([]);
  const [areas, setAreas] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Modal (details)
  const [activeId, setActiveId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Favorites
  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem("favorites:v1");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Persist favorites
  useEffect(() => {
    localStorage.setItem("favorites:v1", JSON.stringify(favorites));
  }, [favorites]);

  // Prefetch filters (categories & areas)
  useEffect(() => {
    (async () => {
      try {
        const [catsRes, areasRes] = await Promise.all([
          fetch(`${THEMEAL_BASE}/list.php?c=list`).then((r) => r.json()),
          fetch(`${THEMEAL_BASE}/list.php?a=list`).then((r) => r.json()),
        ]);
        setCategories(catsRes?.meals?.map((m) => m.strCategory) || []);
        setAreas(areasRes?.meals?.map((m) => m.strArea) || []);
      } catch (e) {
        // Non-blocking; filters are optional
      }
    })();
  }, []);

  // Debounce for name/ingredient input
  const debounceRef = useRef(null);
  const handleQueryChange = (v) => {
    setQuery(v);
    if (mode === "name") {
      // auto-trigger search for name mode
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        runSearch();
      }, 450);
    }
  };

  // Core fetch utilities
  const fetchByIngredient = async (ing) => {
    const res = await fetch(
      `${THEMEAL_BASE}/filter.php?i=${encodeURIComponent(ing)}`
    );
    const data = await res.json();
    return data.meals || [];
  };
  const fetchByName = async (name) => {
    const res = await fetch(
      `${THEMEAL_BASE}/search.php?s=${encodeURIComponent(name)}`
    );
    const data = await res.json();
    // search.php returns full objects; normalize to list shape
    return (data.meals || []).map((m) => ({
      idMeal: m.idMeal,
      strMeal: m.strMeal,
      strMealThumb: m.strMealThumb,
    }));
  };
  const fetchByCategory = async (cat) => {
    const res = await fetch(
      `${THEMEAL_BASE}/filter.php?c=${encodeURIComponent(cat)}`
    );
    const data = await res.json();
    return data.meals || [];
  };
  const fetchByArea = async (ar) => {
    const res = await fetch(
      `${THEMEAL_BASE}/filter.php?a=${encodeURIComponent(ar)}`
    );
    const data = await res.json();
    return data.meals || [];
  };

  const intersectById = (lists) => {
    const nonEmpty = lists.filter((l) => l && l.length);
    if (nonEmpty.length === 0) return [];
    const map = new Map();
    nonEmpty.forEach((list, idx) => {
      list.forEach((m) => {
        map.set(m.idMeal, (map.get(m.idMeal) || 0) + 1);
      });
    });
    const needed = nonEmpty.length;
    const anyList = nonEmpty[0];
    return anyList.filter((m) => map.get(m.idMeal) === needed);
  };

  const runSearch = async () => {
    setLoading(true);
    setError(null);
    setMeals([]);
    setPage(1);
    try {
      let lists = [];
  
      if (mode === "ingredient") {
        if (query.trim()) {
          lists.push(await fetchByIngredient(query.trim()));
        } else {
          // fetch all recipes if empty
          lists.push(await fetchByName(""));
        }
      } else if (mode === "name") {
        if (query.trim()) {
          lists.push(await fetchByName(query.trim()));
        } else {
          // fetch all recipes if empty
          lists.push(await fetchByName(""));
        }
      }
  
      if (category) lists.push(await fetchByCategory(category));
      if (area) lists.push(await fetchByArea(area));
  
      let finalMeals;
      if (lists.length === 0) {
        finalMeals = [];
      } else if (lists.length === 1) {
        finalMeals = lists[0];
      } else {
        finalMeals = intersectById(lists);
      }
  
      if (finalMeals.length === 0) {
        setMeals([]);
        setError("No recipes matched your criteria.");
      } else {
        // De-duplicate & sort by name
        const uniq = Object.values(
          finalMeals.reduce((acc, m) => {
            acc[m.idMeal] = m;
            return acc;
          }, {})
        ).sort((a, b) => a.strMeal.localeCompare(b.strMeal));
        setMeals(uniq);
      }
    } catch (e) {
      setError("Something went wrong while fetching recipes. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  

  // Pagination slice
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(meals.length / pageSize)),
    [meals.length]
  );
  const pagedMeals = useMemo(() => {
    const start = (page - 1) * pageSize;
    return meals.slice(start, start + pageSize);
  }, [meals, page]);

  // Details modal fetch
  const openDetails = async (id) => {
    setActiveId(id);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`${THEMEAL_BASE}/lookup.php?i=${id}`);
      const data = await res.json();
      setDetail(data?.meals?.[0] || null);
      if (!data?.meals?.[0]) setDetailError("Could not load recipe details.");
    } catch (e) {
      setDetailError("Could not load recipe details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    setActiveId(null);
    setDetail(null);
    setDetailError(null);
  };

  // Keyboard: Esc closes modal
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") closeDetails();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleFavorite = (meal) => {
    setFavorites((prev) => {
      const exists = prev.find((m) => m.idMeal === meal.idMeal);
      if (exists) return prev.filter((m) => m.idMeal !== meal.idMeal);
      return [...prev, meal];
    });
  };

  const isFav = (id) => favorites.some((f) => f.idMeal === id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white text-gray-900">
      <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/60 border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-orange-600">
            🍳 Recipe Ideas
          </h1>
          <div className="flex items-center gap-2">
            <ModeToggle mode={mode} setMode={setMode} onSearch={runSearch} />
            <input
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder={
                mode === "ingredient"
                  ? "Ingredient e.g. chicken, paneer"
                  : "Search by name e.g. biryani"
              }
              className="w-full md:w-80 px-4 py-2 rounded-xl border border-orange-200 bg-orange-500 text-white placeholder-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-400"

            />
            <button
              onClick={runSearch}
              className="px-4 py-2 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 active:scale-[0.99] transition"
              aria-label="Search recipes"
            >
              Search
            </button>
          </div>
          <div className="flex gap-2">
            <FilterSelect
              label="Category"
              value={category}
              onChange={setCategory}
              options={categories}
            />
            <FilterSelect
              label="Area"
              value={area}
              onChange={setArea}
              options={areas}
            />
            <button
              onClick={() => {
                setQuery("");
                setCategory("");
                setArea("");
                setMeals([]);
                setError(null);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100"

              aria-label="Clear all filters"
            >
              Clear
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Favorites */}
        {favorites.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">⭐ Favorites</h2>
              <button
                onClick={() => setFavorites([])}
                className="text-sm text-orange-700 hover:underline"
              >
                Clear favorites
              </button>
            </div>
            <CardGrid>
              {favorites.map((m) => (
                <RecipeCard
                  key={`fav-${m.idMeal}`}
                  meal={m}
                  onOpen={() => openDetails(m.idMeal)}
                  onFav={() => toggleFavorite(m)}
                  isFavorite={true}
                />
              ))}
            </CardGrid>
          </section>
        )}

        {/* Results */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              Results {meals.length ? `(${meals.length})` : ""}
            </h2>
            {meals.length > 0 && (
              <p className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </p>
            )}
          </div>

          {loading && <SkeletonGrid />}
          {!loading && error && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={runSearch}
                className="px-3 py-1 rounded-lg bg-red-600 text-white"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && meals.length === 0 && <EmptyState />}

          {!loading && !error && meals.length > 0 && (
            <>
              <CardGrid>
                {pagedMeals.map((m) => (
                  <RecipeCard
                    key={m.idMeal}
                    meal={m}
                    onOpen={() => openDetails(m.idMeal)}
                    onFav={() => toggleFavorite(m)}
                    isFavorite={isFav(m.idMeal)}
                  />
                ))}
              </CardGrid>
              <Pagination
                page={page}
                setPage={setPage}
                totalPages={totalPages}
              />
            </>
          )}
        </section>
      </main>

      {/* Details Modal */}
      {activeId && (
        <Modal
          onClose={closeDetails}
          title={detail?.strMeal || "Recipe Details"}
        >
          {detailLoading && <p className="p-4">Loading details…</p>}
          {detailError && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700">
              {detailError}
            </div>
          )}
          {!detailLoading && !detailError && detail && (
            <RecipeDetail detail={detail} />
          )}
        </Modal>
      )}

      <footer className="max-w-6xl mx-auto px-4 py-10 text-sm text-gray-500">
        <p>
          Data by{" "}
          <a
            className="underline"
            href="https://www.themealdb.com/"
            target="_blank"
            rel="noreferrer"
          >
            TheMealDB
          </a>
          . Built with React + Tailwind.
        </p>
      </footer>
    </div>
  );
}

// ============ UI Components ============
function ModeToggle({ mode, setMode, onSearch }) {
  return (
    <div className="inline-flex rounded-xl border border-orange-200 overflow-hidden">
      <button
        className={`px-3 py-2 text-sm ${
          mode === "ingredient" ? "bg-orange-100 text-orange-800" : "bg-white"
        }`}
        onClick={() => {
          setMode("ingredient");
          onSearch();
        }}
      >
        By Ingredient
      </button>
      <button
        className={`px-3 py-2 text-sm ${
          mode === "name" ? "bg-orange-100 text-orange-800" : "bg-white"
        }`}
        onClick={() => {
          setMode("name");
          onSearch();
        }}
      >
        By Name
      </button>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-gray-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-xl border border-orange-200 bg-white"
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function CardGrid({ children }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {children}
    </div>
  );
}

function SkeletonGrid() {
  const items = Array.from({ length: 8 });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {items.map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-white h-72 rounded-2xl shadow-inner"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-orange-200 p-10 text-center">
      <p className="text-gray-600">
        Start by entering an ingredient (e.g., <b>chicken</b>) or switch to name
        search.
      </p>
      <p className="text-gray-500 mt-2 text-sm">
        Tip: Add Category/Area filters to narrow results. ⭐ Favorite the dishes
        you like.
      </p>
    </div>
  );
}

function RecipeCard({ meal, onOpen, onFav, isFavorite }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden ring-1 ring-orange-100 hover:shadow-md transition">
      <div className="relative">
        <img
          src={meal.strMealThumb}
          alt={meal.strMeal}
          className="w-full h-44 object-cover"
        />
        <button
          className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-medium ${
            isFavorite ? "bg-yellow-400/90" : "bg-white/90"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onFav();
          }}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite ? "★ Favorite" : "☆ Favorite"}
        </button>
      </div>
      <div className="p-4">
        <h3 className="font-semibold line-clamp-2 min-h-[3rem]">
          {meal.strMeal}
        </h3>
        <div className="mt-3 flex gap-2">
          <button
            onClick={onOpen}
            className="flex-1 px-3 py-2 rounded-xl bg-orange-500 text-white text-sm hover:bg-orange-600"
          >
            View Details
          </button>
          <a
            href={`https://www.themealdb.com/meal/${meal.idMeal}`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-xl border text-sm"
          >
            Source
          </a>
        </div>
      </div>
    </div>
  );
}

function Pagination({ page, setPage, totalPages }) {
  if (totalPages <= 1) return null;
  const go = (p) => setPage(Math.min(Math.max(1, p), totalPages));
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        className="px-3 py-2 rounded-lg border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed"

        onClick={() => go(1)}
        disabled={page === 1}
      >
        First
      </button>
      <button
        className="px-3 py-2 rounded-lg border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed"

        onClick={() => go(page - 1)}
        disabled={page === 1}
      >
        Prev
      </button>
      <span className="px-3 py-2 text-sm">
        Page {page} / {totalPages}
      </span>
      <button
        className="px-3 py-2 rounded-lg border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed"

        onClick={() => go(page + 1)}
        disabled={page === totalPages}
      >
        Next
      </button>
      <button
        className="px-3 py-2 rounded-lg border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed"

        onClick={() => go(totalPages)}
        disabled={page === totalPages}
      >
        Last
      </button>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-w-3xl w-[92vw] md:w-[60vw] max-h-[85vh] overflow-auto bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="px-3 py-1 rounded-lg border">
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function RecipeDetail({ detail }) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ing = detail[`strIngredient${i}`];
    const meas = detail[`strMeasure${i}`];
    if (ing && ing.trim())
      ingredients.push(`${ing}${meas ? ` — ${meas}` : ""}`);
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <img
          src={detail.strMealThumb}
          alt={detail.strMeal}
          className="rounded-2xl w-full object-cover shadow"
        />
        <div className="mt-3 text-sm text-gray-600 space-y-1">
          {detail.strCategory && (
            <p>
              <b>Category:</b> {detail.strCategory}
            </p>
          )}
          {detail.strArea && (
            <p>
              <b>Area:</b> {detail.strArea}
            </p>
          )}
          {detail.strTags && (
            <p>
              <b>Tags:</b> {detail.strTags}
            </p>
          )}
          {detail.strSource && (
            <p>
              <a
                className="text-orange-700 underline"
                href={detail.strSource}
                target="_blank"
                rel="noreferrer"
              >
                Source
              </a>
            </p>
          )}
          {detail.strYoutube && (
            <p>
              <a
                className="text-orange-700 underline"
                href={detail.strYoutube}
                target="_blank"
                rel="noreferrer"
              >
                YouTube
              </a>
            </p>
          )}
        </div>
      </div>
      <div className="md:col-span-2 space-y-6">
        <section>
          <h4 className="font-semibold mb-2">Ingredients</h4>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {ingredients.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </section>
        <section>
          <h4 className="font-semibold mb-2">Instructions</h4>
          <p className="whitespace-pre-line leading-7 text-[15px]">
            {detail.strInstructions}
          </p>
        </section>
      </div>
    </div>
  );
}
