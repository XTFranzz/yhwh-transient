import { Link, Outlet } from "react-router-dom";
import { Icon } from "../components/ui/Icon";

export function PublicLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-white">
      <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-white">
            <Icon name="building" className="text-brand-400" />
            YHWH Transient
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium text-ink-300">
            <Link to="/" className="hidden hover:text-white sm:inline">
              Houses
            </Link>
            <Link to="/vehicles" className="hidden hover:text-white sm:inline">
              Vehicles
            </Link>
            <Link to="/tours" className="hidden hover:text-white sm:inline">
              Tours
            </Link>
            <Link to="/my-booking" className="hover:text-white">
              My booking
            </Link>
            <Link to="/contact" className="hidden hover:text-white sm:inline">
              Contact
            </Link>
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
              <p className="flex items-center gap-2 font-semibold text-ink-900">
                <Icon name="building" className="text-brand-500" />
                YHWH Transient
              </p>
              <p className="mt-1">Staycation houses in Town Proper.</p>
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
              <Link to="/contact" className="hover:text-ink-800">
                Contact
              </Link>
              <Link to="/faqs" className="hover:text-ink-800">
                FAQs
              </Link>
              <Link to="/my-booking" className="hover:text-ink-800">
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
