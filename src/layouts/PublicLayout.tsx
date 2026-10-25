import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Icon } from "../components/ui/Icon";
import { LogoWordmark } from "../components/ui/Logo";
import { SocialProofPopup } from "../components/SocialProofPopup";

type NavKey = "home" | "services" | "about" | "partner";

// Homepage sections the scroll-spy watches, mapped to the nav item they
// highlight (vehicles and tours both light up "Services").
const SPY_SECTIONS: { id: string; nav: NavKey }[] = [
  { id: "houses", nav: "home" },
  { id: "vehicles", nav: "services" },
  { id: "tours", nav: "services" },
  { id: "my-booking", nav: "home" },
  { id: "about", nav: "about" },
];

const SERVICE_LINKS = [
  { to: "/#vehicles", label: "Vehicle Rental", description: "Vans & cars, self-drive or with driver", icon: "truck" },
  { to: "/#tours", label: "Tours", description: "Guided day tours around the city", icon: "signpost-2" },
];

export function PublicLayout() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [spyNav, setSpyNav] = useState<NavKey>("home");
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeNav: NavKey | null = location.pathname === "/partner" ? "partner" : isHome ? spyNav : null;

  // Close the mobile menu whenever one of its links navigates.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  // Deep-linking: jump to the right section whenever the hash changes,
  // whether that's a nav click, a footer link, or a link from another page.
  // Scrolls more than once because web fonts, hero images, and Convex query
  // results can all still resize sections after the first attempt fires.
  useEffect(() => {
    if (!isHome || !location.hash) return;
    const id = location.hash.slice(1);
    const scrollToSection = () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    const raf = requestAnimationFrame(scrollToSection);
    const retry1 = setTimeout(scrollToSection, 350);
    const retry2 = setTimeout(scrollToSection, 900);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(retry1);
      clearTimeout(retry2);
    };
  }, [isHome, location.hash]);

  // Scroll-spy: highlight the nav item for whichever section is in view.
  useEffect(() => {
    if (!isHome) return;
    const sections = SPY_SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const match = visible[0] && SPY_SECTIONS.find((s) => s.id === visible[0].target.id);
        if (match) setSpyNav(match.nav);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [isHome]);

  const navLinkClass = (key: NavKey) =>
    `flex items-center gap-1.5 py-2 transition-colors ${
      activeNav === key ? "text-brand-600" : "text-ink-800 hover:text-brand-600"
    }`;

  return (
    <div className="flex min-h-svh flex-col bg-white">
      <header className="sticky top-0 z-40 border-b border-ink-100/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3.5 sm:px-6 lg:px-8">
          <Link to="/" aria-label="YHWH Transient home">
            <LogoWordmark tone="dark" />
          </Link>

          <nav className="hidden items-center gap-9 text-[15px] font-medium md:flex" aria-label="Main">
            <Link
              to="/"
              onClick={() => isHome && window.scrollTo({ top: 0, behavior: "smooth" })}
              className={navLinkClass("home")}
            >
              Home
            </Link>

            {/* Services: opens on hover, and on keyboard focus via focus-within. */}
            <div className="group relative">
              <button type="button" className={navLinkClass("services")} aria-haspopup="true">
                Services
                <Icon
                  name="chevron-down"
                  className="text-xs transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180"
                />
              </button>
              <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <div className="w-72 rounded-2xl border border-ink-100 bg-white p-2 shadow-popover">
                  {SERVICE_LINKS.map((service) => (
                    <Link
                      key={service.to}
                      to={service.to}
                      // Drop focus so focus-within doesn't keep the menu open after a click.
                      onClick={(e) => e.currentTarget.blur()}
                      className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-brand-50"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                        <Icon name={service.icon} />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-ink-900">{service.label}</span>
                        <span className="block text-xs text-ink-500">{service.description}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <Link to="/#about" className={navLinkClass("about")}>
              About
            </Link>
            <Link to="/partner" className={navLinkClass("partner")}>
              Be a Partner
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/admin/login" className="hidden text-[15px] font-medium text-ink-800 hover:text-brand-600 md:inline">
              Staff login
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="rounded-full p-2 text-xl text-ink-800 hover:bg-ink-50 md:hidden"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              <Icon name={mobileOpen ? "x-lg" : "list"} />
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="border-t border-ink-100 bg-white px-4 pb-5 pt-2 animate-fade-in md:hidden" aria-label="Main">
            <Link to="/" className="block rounded-xl px-3 py-3 font-medium text-ink-900 hover:bg-ink-50">
              Home
            </Link>
            <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-widest text-ink-400">Services</p>
            {SERVICE_LINKS.map((service) => (
              <Link
                key={service.to}
                to={service.to}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium text-ink-900 hover:bg-ink-50"
              >
                <Icon name={service.icon} className="text-brand-600" /> {service.label}
              </Link>
            ))}
            <Link to="/#about" className="mt-2 block rounded-xl px-3 py-3 font-medium text-ink-900 hover:bg-ink-50">
              About
            </Link>
            <Link to="/partner" className="block rounded-xl px-3 py-3 font-medium text-ink-900 hover:bg-ink-50">
              Be a Partner
            </Link>
            <Link to="/admin/login" className="mt-2 block rounded-xl px-3 py-3 text-sm text-ink-500 hover:bg-ink-50">
              Staff login
            </Link>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-ink-100 bg-ink-50">
        <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-ink-500 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
            <div>
              <LogoWordmark tone="dark" size={26} />
              <p className="mt-2">Staycation houses in Town Proper.</p>
            </div>
            <div className="flex flex-col gap-2 text-ink-600 sm:flex-row sm:gap-6">
              <a href="tel:+639171234567" className="flex items-center gap-2 hover:text-ink-900">
                <Icon name="telephone-fill" className="text-brand-500" /> 0917-123-4567
              </a>
              <a href="mailto:hello@yhwh-transient.example" className="flex items-center gap-2 hover:text-ink-900">
                <Icon name="envelope-fill" className="text-brand-500" /> hello@yhwh-transient.example
              </a>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <Link to="/#contact" className="hover:text-ink-800">
                Contact
              </Link>
              <Link to="/faqs" className="hover:text-ink-800">
                FAQs
              </Link>
              <Link to="/#my-booking" className="hover:text-ink-800">
                Manage booking
              </Link>
              <Link to="/partner" className="hover:text-ink-800">
                Be a Partner
              </Link>
            </div>
          </div>
          <p className="mt-6 text-xs text-ink-400">© {new Date().getFullYear()} YHWH Transient. All rights reserved.</p>
        </div>
      </footer>

      <SocialProofPopup />
    </div>
  );
}
