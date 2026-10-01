import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Icon } from "../components/ui/Icon";
import { LogoWordmark } from "../components/ui/Logo";

const SECTION_LINKS = [
  { id: "houses", label: "Houses" },
  { id: "vehicles", label: "Vehicles" },
  { id: "tours", label: "Tours" },
  { id: "my-booking", label: "My booking" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

export function PublicLayout() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [activeId, setActiveId] = useState(SECTION_LINKS[0].id);

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

  // Scroll-spy: highlight whichever section is currently in view.
  useEffect(() => {
    if (!isHome) return;
    const sections = SECTION_LINKS.map((link) => document.getElementById(link.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [isHome]);

  return (
    <div className="flex min-h-svh flex-col bg-white">
      <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/">
            <LogoWordmark />
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-ink-300">
            {SECTION_LINKS.map((link) => (
              <Link
                key={link.id}
                to={`/#${link.id}`}
                className={`hidden border-b-2 pb-1 transition-colors sm:inline ${
                  isHome && activeId === link.id ? "border-brand-400 text-white" : "border-transparent hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/admin/login"
              className="flex items-center gap-1.5 rounded-lg border border-ink-700 px-4 py-2 text-white hover:border-ink-500 hover:bg-ink-800"
            >
              Staff login <Icon name="arrow-right" />
            </Link>
          </nav>
        </div>
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
            <div className="flex gap-6">
              <Link to="/#contact" className="hover:text-ink-800">
                Contact
              </Link>
              <Link to="/faqs" className="hover:text-ink-800">
                FAQs
              </Link>
              <Link to="/#my-booking" className="hover:text-ink-800">
                Manage booking
              </Link>
            </div>
          </div>
          <p className="mt-6 text-xs text-ink-400">© {new Date().getFullYear()} YHWH Transient. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
