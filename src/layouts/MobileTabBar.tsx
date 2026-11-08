import { Link, useLocation } from "react-router-dom";
import { Icon } from "../components/ui/Icon";

const TABS = [
  { key: "home", to: "/", label: "Home", icon: "house-door", activeIcon: "house-door-fill" },
  { key: "explore", to: "/search", label: "Explore", icon: "compass", activeIcon: "compass-fill" },
  { key: "booking", to: "/#my-booking", label: "My booking", icon: "calendar-check", activeIcon: "calendar-check-fill" },
  { key: "contact", to: "/#contact", label: "Contact", icon: "chat-dots", activeIcon: "chat-dots-fill" },
];

// Phone-only floating tab bar, like a native app's bottom navigation.
export function MobileTabBar() {
  const { pathname, hash } = useLocation();
  const activeKey =
    pathname === "/search"
      ? "explore"
      : pathname === "/" && hash === "#my-booking"
        ? "booking"
        : pathname === "/" && hash === "#contact"
          ? "contact"
          : pathname === "/"
            ? "home"
            : null;

  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-40 mb-[env(safe-area-inset-bottom)] rounded-2xl bg-ink-900 px-2 shadow-popover md:hidden"
      aria-label="App navigation"
    >
      <ul className="flex h-16 items-stretch justify-around">
        {TABS.map((tab) => {
          const active = tab.key === activeKey;
          return (
            <li key={tab.key} className="flex flex-1">
              <Link
                to={tab.to}
                onClick={() => tab.key === "home" && pathname === "/" && window.scrollTo({ top: 0, behavior: "smooth" })}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  active ? "text-brand-300" : "text-ink-400 hover:text-white"
                }`}
              >
                <Icon name={active ? tab.activeIcon : tab.icon} className="text-xl" />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
