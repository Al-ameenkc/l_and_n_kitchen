"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import type { DbCategory, DbDish } from "@/lib/menu-db";

type Tab = "categories" | "dishes";

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-green-500";

function Field({
  id,
  label,
  hint,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-zinc-300">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </label>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      {children}
    </div>
  );
}

const emptyDish = {
  name: "",
  category_id: "",
  price: 0,
  short_description: "",
  description: "",
  ingredients: "",
  allergens: "",
  prep_time_min: 10,
  prep_time_max: 20,
  estimated_calories: 0,
  best_combo_with: "",
  image_url: "",
};

async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  return data.url as string;
}

function CategoryCirclePreview({ src, alt }: { src?: string; alt: string }) {
  return (
    <div className="flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-full bg-white shadow-sm">
      {src ? (
        <div className="relative h-[78%] w-[78%]">
          <Image src={src} alt={alt} fill className="object-contain" unoptimized />
        </div>
      ) : (
        <span className="text-xs text-zinc-400">No image</span>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<Tab>("categories");
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [dishes, setDishes] = useState<DbDish[]>([]);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  const showMessage = (text: string, isError = false) => {
    setMessage(text);
    setMessageIsError(isError);
  };

  const [catName, setCatName] = useState("");
  const [catSort, setCatSort] = useState(0);
  const [catImage, setCatImage] = useState("");

  const [dishForm, setDishForm] = useState(emptyDish);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [cRes, dRes] = await Promise.all([
      fetch("/api/admin/categories"),
      fetch("/api/admin/dishes"),
    ]);
    if (cRes.status === 401 || dRes.status === 401) {
      setAuthed(false);
      return;
    }
    setCategories(await cRes.json());
    setDishes(await dRes.json());
    setAuthed(true);
  }, []);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) load();
        else setAuthed(false);
      })
      .catch(() => setAuthed(false));
  }, [load]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const data = await res.json();
      setLoginError(data.error ?? "Login failed");
      return;
    }
    setPassword("");
    await load();
  };

  const logout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthed(false);
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catName, sort_order: catSort, image_url: catImage || null }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error);
      setMessageIsError(true);
      return;
    }
    setCatName("");
    setCatSort(0);
    setCatImage("");
    showMessage("Category added.");
    load();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category and all its dishes?")) return;
    await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    load();
  };

  const updateCategoryImage = async (id: string, file: File) => {
    try {
      const url = await uploadImage(file);
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: url }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.error ?? "Failed to update image", true);
        return;
      }
      showMessage("Category image updated.");
      load();
    } catch (err) {
      showMessage(err instanceof Error ? err.message : "Upload failed", true);
    }
  };

  const saveDish = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...dishForm, price: Number(dishForm.price) };
    const url = editingDishId ? `/api/admin/dishes/${editingDishId}` : "/api/admin/dishes";
    const method = editingDishId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      showMessage(data.error, true);
      return;
    }
    setDishForm(emptyDish);
    setEditingDishId(null);
    showMessage(editingDishId ? "Dish updated." : "Dish created.");
    load();
  };

  const editDish = (dish: DbDish) => {
    setEditingDishId(dish.id);
    setDishForm({
      name: dish.name,
      category_id: dish.category_id,
      price: Number(dish.price),
      short_description: dish.short_description,
      description: dish.description,
      ingredients: (dish.ingredients ?? []).join(", "),
      allergens: (dish.allergens ?? []).join(", "),
      prep_time_min: dish.prep_time_min,
      prep_time_max: dish.prep_time_max,
      estimated_calories: dish.estimated_calories,
      best_combo_with: dish.best_combo_with,
      image_url: dish.image_url ?? "",
    });
    setTab("dishes");
    window.scrollTo({ top: 0 });
  };

  const deleteDish = async (id: string) => {
    if (!confirm("Delete this dish?")) return;
    await fetch(`/api/admin/dishes/${id}`, { method: "DELETE" });
    load();
  };

  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
        <h1 className="text-2xl font-extrabold">L&amp;N Admin</h1>
        <p className="mt-1 text-sm text-zinc-500">Sign in with your admin password</p>
        <form onSubmit={login} className="mt-8 space-y-4">
          <Field id="admin-password" label="Admin password" required>
            <input
              id="admin-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className={inputClass}
            />
          </Field>
          {loginError && <p className="text-sm text-red-400">{loginError}</p>}
          <button
            type="submit"
            className="w-full rounded-xl bg-white py-3 font-bold text-black"
          >
            Sign in
          </button>
        </form>
        <a href="/" className="mt-6 text-center text-sm text-zinc-500 underline">
          Back to menu
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-16">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Menu Admin</h1>
          <p className="text-sm text-zinc-500">Manage categories &amp; dishes</p>
        </div>
        <div className="flex gap-2">
          <a href="/" className="rounded-lg border border-zinc-700 px-3 py-2 text-sm">
            View menu
          </a>
          <button type="button" onClick={logout} className="rounded-lg bg-zinc-800 px-3 py-2 text-sm">
            Log out
          </button>
        </div>
      </div>

      {message && (
        <p
          className={`mt-4 rounded-lg px-3 py-2 text-sm ${
            messageIsError ? "bg-red-950/50 text-red-300" : "bg-green-950/50 text-green-300"
          }`}
        >
          {message}
        </p>
      )}

      <div className="mt-6 flex gap-2">
        {(["categories", "dishes"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${
              tab === t ? "bg-white text-black" : "bg-zinc-900 text-zinc-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "categories" && (
        <div className="mt-8 space-y-8">
          <form onSubmit={addCategory} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div>
              <h2 className="font-bold">Add category</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Categories appear in the menu carousel at the top. Lower sort order = further left.
              </p>
            </div>

            <Field
              id="cat-name"
              label="Category name"
              required
              hint='Exact name shown on the menu (e.g. "Soups", "Grills").'
            >
              <input
                id="cat-name"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Soups"
                className={inputClass}
              />
            </Field>

            <Field
              id="cat-sort"
              label="Sort order"
              hint="Number controlling carousel position. Use 0, 10, 20… so you can insert categories later."
            >
              <input
                id="cat-sort"
                type="number"
                value={catSort}
                onChange={(e) => setCatSort(Number(e.target.value))}
                placeholder="0"
                className={inputClass}
              />
            </Field>

            <Field
              id="cat-image"
              label="Category image"
              hint="Optional. Shown in the white circle on the menu carousel. JPG, PNG, or WebP, max 5 MB."
            >
              <div className="flex items-center gap-4">
                <CategoryCirclePreview src={catImage || undefined} alt={catName || "Preview"} />
                <label
                  htmlFor="cat-image"
                  className="cursor-pointer rounded-lg border border-dashed border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
                >
                  {catImage ? "Change image" : "Choose image file"}
                  <input
                    id="cat-image"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        setCatImage(await uploadImage(file));
                        showMessage("Image uploaded. Click “Add category” to save.");
                      } catch (err) {
                        showMessage(err instanceof Error ? err.message : "Upload failed", true);
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </Field>

            <button type="submit" className="rounded-lg bg-green-600 px-4 py-2 font-semibold">
              Add category
            </button>
          </form>

          <div>
            <h2 className="mb-2 font-bold">Existing categories</h2>
            <p className="mb-3 text-xs text-zinc-500">Delete removes the category and all dishes in it.</p>
            <ul className="space-y-2">
              {categories.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <CategoryCirclePreview src={c.image_url ?? undefined} alt={c.name} />
                    <div>
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-zinc-500">Order: {c.sort_order}</p>
                      <label className="mt-1 inline-block cursor-pointer text-xs text-green-400 hover:underline">
                        Change image
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) updateCategoryImage(c.id, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteCategory(c.id)}
                    className="text-sm text-red-400"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === "dishes" && (
        <div className="mt-8 space-y-8">
          <form onSubmit={saveDish} className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="font-bold">{editingDishId ? "Edit dish" : "Add dish"}</h2>
            <input
              required
              value={dishForm.name}
              onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
              placeholder="Dish name"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
            />
            <select
              required
              value={dishForm.category_id}
              onChange={(e) => setDishForm({ ...dishForm, category_id: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Field
              id="dish-price"
              label="Price (NGN)"
              required
              hint="Amount customers pay for one portion (example: 2500)."
            >
              <input
                id="dish-price"
                type="number"
                required
                min={0}
                step={1}
                value={dishForm.price}
                onChange={(e) =>
                  setDishForm({ ...dishForm, price: Number(e.target.value) })
                }
                placeholder="e.g. 2500"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none"
              />
            </Field>
            <input
              value={dishForm.short_description}
              onChange={(e) => setDishForm({ ...dishForm, short_description: e.target.value })}
              placeholder="Short description"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
            />
            <textarea
              value={dishForm.description}
              onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
              placeholder="Full description"
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
            />
            <input
              value={dishForm.ingredients}
              onChange={(e) => setDishForm({ ...dishForm, ingredients: e.target.value })}
              placeholder="Ingredients (comma separated)"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
            />
            <input
              value={dishForm.allergens}
              onChange={(e) => setDishForm({ ...dishForm, allergens: e.target.value })}
              placeholder="Allergens (comma separated)"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
            />
            <div className="grid grid-cols-2 gap-2">
              <Field
                id="dish-prep-min"
                label="Prep min"
                hint="Minimum preparation time in minutes."
              >
                <input
                  id="dish-prep-min"
                  type="number"
                  min={0}
                  step={1}
                  value={dishForm.prep_time_min}
                  onChange={(e) =>
                    setDishForm({ ...dishForm, prep_time_min: Number(e.target.value) })
                  }
                  placeholder="e.g. 10"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none"
                />
              </Field>

              <Field
                id="dish-prep-max"
                label="Prep max"
                hint="Maximum preparation time in minutes (should be >= min)."
              >
                <input
                  id="dish-prep-max"
                  type="number"
                  min={0}
                  step={1}
                  value={dishForm.prep_time_max}
                  onChange={(e) =>
                    setDishForm({ ...dishForm, prep_time_max: Number(e.target.value) })
                  }
                  placeholder="e.g. 20"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none"
                />
              </Field>
            </div>

            <Field
              id="dish-calories"
              label="Estimated calories"
              hint="Approx calories per portion (integer)."
            >
              <input
                id="dish-calories"
                type="number"
                min={0}
                step={1}
                value={dishForm.estimated_calories}
                onChange={(e) =>
                  setDishForm({
                    ...dishForm,
                    estimated_calories: Number(e.target.value),
                  })
                }
                placeholder="e.g. 450"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none"
              />
            </Field>
            <input
              value={dishForm.best_combo_with}
              onChange={(e) => setDishForm({ ...dishForm, best_combo_with: e.target.value })}
              placeholder="Best combo with…"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
            />
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const url = await uploadImage(file);
                  setDishForm({ ...dishForm, image_url: url });
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : "Upload failed");
                }
              }}
              className="w-full text-sm text-zinc-400"
            />
            {dishForm.image_url && (
              <div className="relative h-24 w-full overflow-hidden rounded-xl">
                <Image src={dishForm.image_url} alt="" fill className="object-cover" unoptimized />
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" className="rounded-lg bg-green-600 px-4 py-2 font-semibold">
                {editingDishId ? "Update dish" : "Add dish"}
              </button>
              {editingDishId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingDishId(null);
                    setDishForm(emptyDish);
                  }}
                  className="rounded-lg border border-zinc-600 px-4 py-2"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <ul className="space-y-2">
            {dishes.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {d.image_url && (
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                      <Image src={d.image_url} alt="" fill className="object-cover" unoptimized />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{d.name}</p>
                    <p className="text-xs text-zinc-500">
                      {d.categories?.name ?? "—"} · ₦{Number(d.price).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => editDish(d)} className="text-sm text-green-400">
                    Edit
                  </button>
                  <button type="button" onClick={() => deleteDish(d.id)} className="text-sm text-red-400">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
