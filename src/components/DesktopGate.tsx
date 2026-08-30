"use client";

export function DesktopGate({ children }: { children: React.ReactNode }) {
  return (
    <div className="box-border flex h-[100dvh] justify-center bg-[#111111] p-4 pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] pt-[max(1rem,calc(env(safe-area-inset-top,0px)+0.5rem))] md:items-center md:p-8">
      <div className="relative flex h-full min-h-0 w-full max-w-[430px] flex-col overflow-hidden bg-[#111111] shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-zinc-800 transform-gpu md:h-[min(900px,calc(100dvh-4rem))] md:flex-none md:rounded-[2rem]">
        {children}
      </div>
    </div>
  );
}
