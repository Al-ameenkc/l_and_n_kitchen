export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 overflow-x-hidden overflow-y-auto overscroll-y-contain bg-zinc-950 text-white">
      {children}
    </div>
  );
}
