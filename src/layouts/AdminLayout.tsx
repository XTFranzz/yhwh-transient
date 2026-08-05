import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { Icon } from "../components/ui/Icon";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: "speedometer2", end: true, roles: ["owner_admin", "front_desk", "housekeeping"] },
  { to: "/admin/reservations", label: "Reservations", icon: "calendar-check", roles: ["owner_admin", "front_desk", "housekeeping"] },
  { to: "/admin/listings", label: "Listings", icon: "house-door", roles: ["owner_admin", "front_desk"] },
  { to: "/admin/payments", label: "Payments", icon: "credit-card", roles: ["owner_admin", "front_desk"] },
  { to: "/admin/customers", label: "Customers", icon: "people", roles: ["owner_admin", "front_desk"] },
  { to: "/admin/staff", label: "Staff", icon: "person-badge", roles: ["owner_admin"] },
];

function SidebarNav({ items, onNavigate }: { items: typeof NAV_ITEMS; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
            }`
          }
        >
          <Icon name={item.icon} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AdminLayout() {
  const profile = useQuery(api.staff.me);
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const role = profile?.role ?? "front_desk";
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <div className="flex min-h-svh bg-ink-50">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-100 bg-white px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2 text-lg font-semibold text-ink-900">
          <Icon name="building" className="text-brand-500" />
          YHWH Admin
        </div>
        <SidebarNav items={visibleItems} />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" onClick={() => setMobileNavOpen(false)}>
          <div className="absolute inset-0 bg-ink-900/40" />
          <div
            className="relative flex w-64 flex-col bg-white px-4 py-6 shadow-popover animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-8 flex items-center justify-between px-2">
              <span className="flex items-center gap-2 text-lg font-semibold text-ink-900">
                <Icon name="building" className="text-brand-500" />
                YHWH Admin
              </span>
              <button onClick={() => setMobileNavOpen(false)} className="rounded-full p-1 text-ink-400 hover:bg-ink-100" aria-label="Close menu">
                <Icon name="x-lg" />
              </button>
            </div>
            <SidebarNav items={visibleItems} onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-ink-100 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="rounded-lg p-1.5 text-ink-600 hover:bg-ink-100 md:hidden"
              aria-label="Open menu"
            >
              <Icon name="list" />
            </button>
            <p className="text-sm text-ink-500">Welcome back{profile ? `, ${profile.displayName}` : ""}</p>
          </div>
          <div className="flex items-center gap-3">
            {profile && (
              <span className="hidden rounded-full bg-ink-100 px-3 py-1 text-xs font-medium capitalize text-ink-600 sm:inline">
                {profile.role.replace("_", " ")}
              </span>
            )}
            <button
              onClick={() => void signOut().then(() => navigate("/admin/login"))}
              className="text-sm font-medium text-ink-500 hover:text-ink-900"
            >
              Log out
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
