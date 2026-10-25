import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../../../../components/ui/Icon";

interface SearchBarProps {
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
}

// Phones: 2x2 grid (check-in | check-out, guests | button). sm+: one pill row.
const FIELD_CLASS = "flex min-w-0 flex-1 flex-col gap-0.5 px-4 py-2.5 sm:px-5";
const LABEL_CLASS = "text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500";
const INPUT_CLASS = "w-full min-w-0 bg-transparent text-sm font-medium text-ink-900 outline-none";

export function SearchBar({ initialCheckIn, initialCheckOut, initialGuests }: SearchBarProps) {
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState(initialCheckIn ?? "");
  const [checkOut, setCheckOut] = useState(initialCheckOut ?? "");
  const [guests, setGuests] = useState(initialGuests ?? 1);
  const today = new Date().toISOString().slice(0, 10);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    params.set("guests", String(guests));
    navigate(`/search?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto grid w-full max-w-3xl grid-cols-2 overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-popover sm:flex sm:items-stretch sm:rounded-full"
    >
      <div className={`${FIELD_CLASS} border-b border-r border-ink-100 sm:border-b-0 sm:pl-7`}>
        <label htmlFor="search-check-in" className={LABEL_CLASS}>
          Check-in
        </label>
        <input
          id="search-check-in"
          type="date"
          min={today}
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>
      <div className={`${FIELD_CLASS} border-b border-ink-100 sm:border-b-0 sm:border-r`}>
        <label htmlFor="search-check-out" className={LABEL_CLASS}>
          Check-out
        </label>
        <input
          id="search-check-out"
          type="date"
          min={checkIn || today}
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>
      <div className={`${FIELD_CLASS} border-r border-ink-100 sm:border-r-0`}>
        <label htmlFor="search-guests" className={LABEL_CLASS}>
          Guests
        </label>
        <input
          id="search-guests"
          type="number"
          min={1}
          max={20}
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className={INPUT_CLASS}
        />
      </div>
      <button
        type="submit"
        aria-label="Search"
        className="m-2 flex shrink-0 items-center justify-center gap-2 rounded-full bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600 sm:m-1.5 sm:h-14 sm:w-14 sm:self-center sm:p-0"
      >
        <Icon name="search" className="text-lg" />
        <span className="sm:hidden">Search</span>
      </button>
    </form>
  );
}
