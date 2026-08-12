"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { DbCategory, DbDish } from "@/lib/menu-db";
import type { DbOrder, DbWaiter, OrderStatus } from "@/lib/orders-db";

type Tab = "orders" | "categories" | "dishes" | "waiters";

const DISHES_PER_PAGE = 10;

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
  const [tab, setTab] = useState<Tab>("orders");
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [dishes, setDishes] = useState<DbDish[]>([]);
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [waiters, setWaiters] = useState<DbWaiter[]>([]);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  const showMessage = (text: string, isError = false) => {
    setMessage(text);
    setMessageIsError(isError);
  };

  const [catName, setCatName] = useState("");
  const [catImage, setCatImage] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  const [dishForm, setDishForm] = useState(emptyDish);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [dishSearch, setDishSearch] = useState("");
  const [dishCategoryFilter, setDishCategoryFilter] = useState("all");
  const [dishPage, setDishPage] = useState(1);

  const [waiterForm, setWaiterForm] = useState({
    staff_id: "",
    name: "",
    image_url: "",
  });
  const [editingWaiterId, setEditingWaiterId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [cRes, dRes, oRes, wRes] = await Promise.all([
      fetch("/api/admin/categories"),
      fetch("/api/admin/dishes"),
      fetch("/api/admin/orders"),
      fetch("/api/admin/waiters"),
    ]);
    if (cRes.status === 401 || dRes.status === 401) {
      setAuthed(false);
      return;
    }
    setCategories(await cRes.json());
    setDishes(await dRes.json());

    if (oRes.status === 503 || wRes.status === 503) {
      setSchemaMissing(true);
      setOrders([]);
      setWaiters([]);
    } else {
      setSchemaMissing(false);
      if (oRes.ok) setOrders(await oRes.json());
      if (wRes.ok) setWaiters(await wRes.json());
    }
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
      body: JSON.stringify({ name: catName, image_url: catImage || null }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error);
      setMessageIsError(true);
      return;
    }
    setCatName("");
    setCatImage("");
    showMessage("Category added.");
    load();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category and all its dishes?")) return;
    await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    load();
  };

  const startRenameCategory = (category: DbCategory) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  };

  const cancelRenameCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryName("");
  };

  const saveCategoryName = async (id: string) => {
    const name = editingCategoryName.trim();
    if (!name) {
      showMessage("Category name is required.", true);
      return;
    }
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      showMessage(data.error ?? "Failed to rename category", true);
      return;
    }
    cancelRenameCategory();
    showMessage("Category renamed.");
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
      name: dish.name.toUpperCase(),
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

  const saveWaiter = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      staff_id: waiterForm.staff_id.trim(),
      name: waiterForm.name.trim(),
      image_url: waiterForm.image_url || null,
    };
    const url = editingWaiterId
      ? `/api/admin/waiters/${editingWaiterId}`
      : "/api/admin/waiters";
    const method = editingWaiterId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      showMessage(data.error ?? "Failed to save waiter", true);
      return;
    }
    setWaiterForm({ staff_id: "", name: "", image_url: "" });
    setEditingWaiterId(null);
    showMessage(editingWaiterId ? "Waiter updated." : "Waiter added.");
    load();
  };

  const editWaiter = (waiter: DbWaiter) => {
    setEditingWaiterId(waiter.id);
    setWaiterForm({
      staff_id: waiter.staff_id,
      name: waiter.name,
      image_url: waiter.image_url ?? "",
    });
    setTab("waiters");
    window.scrollTo({ top: 0 });
  };

  const deleteWaiter = async (id: string) => {
    if (!confirm("Delete this waiter?")) return;
    await fetch(`/api/admin/waiters/${id}`, { method: "DELETE" });
    load();
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      showMessage(data.error ?? "Failed to update order", true);
      return;
    }
    showMessage(`Order marked ${status}.`);
    load();
  };

  const filteredDishes = useMemo(() => {
    const query = dishSearch.trim().toLowerCase();
    return dishes.filter((dish) => {
      if (dishCategoryFilter !== "all" && dish.category_id !== dishCategoryFilter) {
        return false;
      }
      if (!query) return true;
      const haystack = [
        dish.name,
        dish.short_description,
        dish.description,
        dish.categories?.name ?? "",
        ...(dish.ingredients ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [dishes, dishSearch, dishCategoryFilter]);

  const dishPageCount = Math.max(1, Math.ceil(filteredDishes.length / DISHES_PER_PAGE));
  const currentDishPage = Math.min(dishPage, dishPageCount);
  const pagedDishes = useMemo(() => {
    const start = (currentDishPage - 1) * DISHES_PER_PAGE;
    return filteredDishes.slice(start, start + DISHES_PER_PAGE);
  }, [filteredDishes, currentDishPage]);

  useEffect(() => {
    setDishPage(1);
  }, [dishSearch, dishCategoryFilter]);

  useEffect(() => {
    if (!authed) return;
    const timer = setInterval(() => {
      if (tab === "orders") load();
    }, 8000);
    return () => clearInterval(timer);
  }, [authed, tab, load]);

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
              name="admin-password"
              type="password"
              autoComplete="current-password"
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

      <div className="mt-6 flex flex-wrap gap-2">
        {(["orders", "categories", "dishes", "waiters"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${
              tab === t ? "bg-white text-black" : "bg-zinc-900 text-zinc-400"
            }`}
          >
            {t}
            {t === "orders" && orders.filter((o) => o.status === "new").length > 0
              ? ` (${orders.filter((o) => o.status === "new").length})`
              : ""}
          </button>
        ))}
      </div>

      {schemaMissing && (
        <div className="mt-4 rounded-xl border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          Orders &amp; waiters tables are missing. In Supabase → SQL Editor, run the file{" "}
          <code className="rounded bg-black/30 px-1">supabase/orders-waiters.sql</code>, then refresh
          this page.
        </div>
      )}

      {tab === "orders" && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Incoming orders</h2>
              <p className="text-xs text-zinc-500">
                Assigned by waiters with table, staff details, and timestamp. Auto-refreshes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => load()}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm"
            >
              Refresh
            </button>
          </div>

          {orders.length === 0 ? (
            <p className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-8 text-center text-sm text-zinc-500">
              No orders assigned yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-green-400">
                        {order.table_label}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        {new Date(order.assigned_at).toLocaleString()} ·{" "}
                        <span className="capitalize text-zinc-300">{order.status}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative h-11 w-11 overflow-hidden rounded-full bg-zinc-800">
                        {order.waiter_image_url ? (
                          <Image
                            src={order.waiter_image_url}
                            alt={order.waiter_name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{order.waiter_name}</p>
                        <p className="text-xs text-zinc-500">ID {order.waiter_staff_id}</p>
                      </div>
                    </div>
                  </div>

                  <ul className="mt-3 space-y-1.5 border-t border-zinc-800 pt-3">
                    {order.items.map((item, index) => (
                      <li
                        key={`${order.id}-${item.id}-${index}`}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="min-w-0 truncate">
                          {index + 1}. {item.name}
                          <span className="text-zinc-500">
                            {" "}
                            · {item.category} · ×{Math.max(1, Number(item.qty) || 1)}
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold">
                          ₦
                          {(
                            Number(item.price) * Math.max(1, Number(item.qty) || 1)
                          ).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-base font-extrabold text-green-400">
                      Total ₦{Number(order.total).toLocaleString()}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {order.status === "new" && (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(order.id, "accepted")}
                          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold"
                        >
                          Accept
                        </button>
                      )}
                      {order.status !== "completed" && order.status !== "cancelled" && (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(order.id, "completed")}
                          className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-semibold"
                        >
                          Complete
                        </button>
                      )}
                      {order.status !== "cancelled" && (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(order.id, "cancelled")}
                          className="rounded-lg text-xs font-semibold text-red-400"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "categories" && (
        <div className="mt-8 space-y-8">
          <form onSubmit={addCategory} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div>
              <h2 className="font-bold">Add category</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Categories appear left to right in the carousel. New categories are added at the end automatically.
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
                name="cat-name"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Soups"
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
                    name="cat-image"
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
            <p className="mb-3 text-xs text-zinc-500">
              Rename updates the name on the menu. Delete removes the category and all dishes in it.
            </p>
            <ul className="space-y-2">
              {categories.map((c, index) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <CategoryCirclePreview src={c.image_url ?? undefined} alt={c.name} />
                    <div className="min-w-0 flex-1">
                      {editingCategoryId === c.id ? (
                        <div className="space-y-2">
                          <input
                            id={`cat-rename-${c.id}`}
                            name={`cat-rename-${c.id}`}
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            className={inputClass}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => saveCategoryName(c.id)}
                              className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelRenameCategory}
                              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="font-semibold">{c.name}</p>
                          <p className="text-xs text-zinc-500">
                            Carousel position: {index + 2} (after All)
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => startRenameCategory(c)}
                              className="text-xs text-green-400 hover:underline"
                            >
                              Rename
                            </button>
                            <label className="inline-block cursor-pointer text-xs text-green-400 hover:underline">
                              Change image
                              <input
                                id={`cat-image-${c.id}`}
                                name={`cat-image-${c.id}`}
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
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteCategory(c.id)}
                    className="shrink-0 text-sm text-red-400"
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
              id="dish-name"
              name="dish-name"
              required
              value={dishForm.name}
              onChange={(e) =>
                setDishForm({ ...dishForm, name: e.target.value.toUpperCase() })
              }
              placeholder="Dish name"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
            />
            <select
              id="dish-category"
              name="dish-category"
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
                name="dish-price"
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
              id="dish-short-description"
              name="dish-short-description"
              value={dishForm.short_description}
              onChange={(e) => setDishForm({ ...dishForm, short_description: e.target.value })}
              placeholder="Short description"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
            />
            <textarea
              id="dish-description"
              name="dish-description"
              value={dishForm.description}
              onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
              placeholder="Full description"
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
            />
            <input
              id="dish-ingredients"
              name="dish-ingredients"
              value={dishForm.ingredients}
              onChange={(e) => setDishForm({ ...dishForm, ingredients: e.target.value })}
              placeholder="Ingredients (comma separated)"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
            />
            <input
              id="dish-allergens"
              name="dish-allergens"
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
                  name="dish-prep-min"
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
                  name="dish-prep-max"
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
                name="dish-calories"
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
              id="dish-best-combo"
              name="dish-best-combo"
              value={dishForm.best_combo_with}
              onChange={(e) => setDishForm({ ...dishForm, best_combo_with: e.target.value })}
              placeholder="Best combo with…"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
            />
            <input
              id="dish-image"
              name="dish-image"
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

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="admin-dish-search"
                name="admin-dish-search"
                type="text"
                value={dishSearch}
                onChange={(e) => setDishSearch(e.target.value)}
                placeholder="Search dishes…"
                className={`${inputClass} sm:flex-1`}
              />
              <select
                id="admin-dish-category-filter"
                name="admin-dish-category-filter"
                value={dishCategoryFilter}
                onChange={(e) => setDishCategoryFilter(e.target.value)}
                className={`${inputClass} sm:w-56`}
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
              <p>
                Showing {pagedDishes.length === 0 ? 0 : (currentDishPage - 1) * DISHES_PER_PAGE + 1}
                –
                {Math.min(currentDishPage * DISHES_PER_PAGE, filteredDishes.length)} of{" "}
                {filteredDishes.length} dishes
              </p>
              {(dishSearch || dishCategoryFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setDishSearch("");
                    setDishCategoryFilter("all");
                  }}
                  className="text-green-400 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>

            <ul className="space-y-2">
              {pagedDishes.length === 0 ? (
                <li className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-8 text-center text-sm text-zinc-500">
                  No dishes match your search or filter.
                </li>
              ) : (
                pagedDishes.map((d) => (
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
                ))
              )}
            </ul>

            {dishPageCount > 1 && (
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  disabled={currentDishPage <= 1}
                  onClick={() => setDishPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <p className="text-sm text-zinc-400">
                  Page {currentDishPage} of {dishPageCount}
                </p>
                <button
                  type="button"
                  disabled={currentDishPage >= dishPageCount}
                  onClick={() => setDishPage((p) => Math.min(dishPageCount, p + 1))}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "waiters" && (
        <div className="mt-8 space-y-8">
          <form onSubmit={saveWaiter} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="font-bold">{editingWaiterId ? "Edit waiter" : "Add waiter"}</h2>
            <p className="text-xs text-zinc-500">
              Waiters enter this ID on the order page. Their photo appears after lookup.
            </p>
            <Field id="waiter-staff-id" label="Waiter ID" required hint='Short code they type (e.g. "W001").'>
              <input
                id="waiter-staff-id"
                name="waiter-staff-id"
                required
                value={waiterForm.staff_id}
                onChange={(e) => setWaiterForm({ ...waiterForm, staff_id: e.target.value })}
                placeholder="e.g. W001"
                className={inputClass}
              />
            </Field>
            <Field id="waiter-name" label="Name" required>
              <input
                id="waiter-name"
                name="waiter-name"
                required
                value={waiterForm.name}
                onChange={(e) => setWaiterForm({ ...waiterForm, name: e.target.value })}
                placeholder="Waiter full name"
                className={inputClass}
              />
            </Field>
            <Field id="waiter-image" label="Photo" hint="Optional. Shown when they enter their ID.">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-full bg-zinc-800">
                  {waiterForm.image_url ? (
                    <Image
                      src={waiterForm.image_url}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-500">
                      No photo
                    </div>
                  )}
                </div>
                <label
                  htmlFor="waiter-image"
                  className="cursor-pointer rounded-lg border border-dashed border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
                >
                  {waiterForm.image_url ? "Change photo" : "Upload photo"}
                  <input
                    id="waiter-image"
                    name="waiter-image"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const url = await uploadImage(file);
                        setWaiterForm({ ...waiterForm, image_url: url });
                        showMessage("Photo uploaded.");
                      } catch (err) {
                        showMessage(err instanceof Error ? err.message : "Upload failed", true);
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </Field>
            <div className="flex gap-2">
              <button type="submit" className="rounded-lg bg-green-600 px-4 py-2 font-semibold">
                {editingWaiterId ? "Update waiter" : "Add waiter"}
              </button>
              {editingWaiterId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingWaiterId(null);
                    setWaiterForm({ staff_id: "", name: "", image_url: "" });
                  }}
                  className="rounded-lg border border-zinc-600 px-4 py-2"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div>
            <h2 className="mb-3 font-bold">Staff list</h2>
            <ul className="space-y-2">
              {waiters.length === 0 ? (
                <li className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-8 text-center text-sm text-zinc-500">
                  No waiters yet. Add staff IDs so they can assign orders.
                </li>
              ) : (
                waiters.map((waiter) => (
                  <li
                    key={waiter.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-zinc-800">
                        {waiter.image_url ? (
                          <Image
                            src={waiter.image_url}
                            alt={waiter.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{waiter.name}</p>
                        <p className="text-xs text-zinc-500">
                          ID {waiter.staff_id}
                          {!waiter.active ? " · inactive" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => editWaiter(waiter)}
                        className="text-sm text-green-400"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteWaiter(waiter.id)}
                        className="text-sm text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
