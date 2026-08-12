import { Suspense } from "react";
import { WaiterOrderView } from "@/components/WaiterOrderView";

export default function OrderPage() {
  return (
    <div className="h-full min-h-[100dvh] overflow-y-auto bg-[#111111]">
      <Suspense
        fallback={
          <div className="flex min-h-[100dvh] items-center justify-center">
            <p className="text-sm text-zinc-500">Loading order…</p>
          </div>
        }
      >
        <WaiterOrderView />
      </Suspense>
    </div>
  );
}
