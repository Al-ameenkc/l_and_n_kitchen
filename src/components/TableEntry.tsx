"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const WAITER_KEY = "ln-waiter-device";
const TABLE_KEY = "ln-table-token";

export function TableEntry({ token }: { token: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("Checking this table…");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      let staffId = "";
      try {
        const raw = localStorage.getItem(WAITER_KEY);
        if (raw) staffId = String((JSON.parse(raw) as { staff_id?: string }).staff_id ?? "");
      } catch {
        staffId = "";
      }

      if (staffId) {
        setMessage("Confirming this table…");
        try {
          const res = await fetch("/api/waiter/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staff_id: staffId, qr_token: token }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Could not confirm the table");
          if (cancelled) return;
          setMessage(
            data.already
              ? `Table ${data.table_number} is already confirmed.`
              : `Table ${data.table_number} is marked taken.`
          );
          window.setTimeout(() => router.replace("/waiter"), 900);
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e.message : "Could not confirm the table");
        }
        return;
      }

      try {
        sessionStorage.setItem(TABLE_KEY, token);
      } catch {
        /* ignore */
      }
      router.replace(`/?table=${encodeURIComponent(token)}`);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [router, token]);

  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <p className="text-lg font-extrabold text-white">{error || message}</p>
      {error ? (
        <button
          type="button"
          onClick={() => router.replace("/waiter")}
          className="mt-6 rounded-full bg-green-500 px-5 py-3 text-sm font-bold text-white"
        >
          Back to waiter
        </button>
      ) : null}
    </div>
  );
}
