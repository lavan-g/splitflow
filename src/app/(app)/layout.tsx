import Link from "next/link";

const routes = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/groups", label: "Groups" },
  { href: "/expenses/new", label: "Add Expense" },
  { href: "/settlements", label: "Settlements" },
  { href: "/profile", label: "Profile" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="mx-auto w-full max-w-7xl px-4 py-5">
        <nav className="glass-card flex flex-wrap items-center gap-2 rounded-2xl p-3">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
            >
              {route.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
