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
        router.replace("/waiter");
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
