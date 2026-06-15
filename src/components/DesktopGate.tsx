"use client";

export function DesktopGate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="hidden min-h-screen items-center justify-center bg-[#111111] p-8 md:flex">
        <div className="max-w-md rounded-[2rem] bg-[#1a1a1a] p-8 text-center ring-1 ring-zinc-800">
          <h1 className="text-2xl font-extrabold text-white">L&amp;N Kitchen Menu</h1>
          <p className="mt-3 text-sm font-normal text-zinc-400">
            This menu is designed for mobile phones. Please open this link on your phone or scan
            the QR code at your table.
          </p>
        </div>
      </div>
      <div className="relative mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-[#111111] md:hidden">
        {children}
      </div>
    </>
  );
}
