"use client";

export function DesktopGate({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] justify-center bg-[#111111] md:items-center md:p-8">
      <div className="relative mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-[#111111] md:h-[min(900px,calc(100dvh-4rem))] md:rounded-[2rem] md:shadow-[0_24px_80px_rgba(0,0,0,0.55)] md:ring-1 md:ring-zinc-800 md:transform-gpu">
        {children}
      </div>
    </div>
  );
}
