import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../../../../components/ui/Icon";

interface SearchBarProps {
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
}

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
      className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-3xl border border-ink-100 bg-white p-3 shadow-popover sm:flex-row sm:items-center sm:gap-0 sm:rounded-full sm:p-2"
    >
      <div className="flex flex-1 flex-col gap-1 px-4 py-1 sm:border-r sm:border-ink-100">
        <label className="text-xs font-semibold text-ink-800">Check-in</label>
        <input
          type="date"
          min={today}
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          className="bg-transparent text-sm text-ink-700 outline-none"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 px-4 py-1 sm:border-r sm:border-ink-100">
        <label className="text-xs font-semibold text-ink-800">Check-out</label>
        <input
          type="date"
          min={checkIn || today}
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          className="bg-transparent text-sm text-ink-700 outline-none"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 px-4 py-1">
        <label className="text-xs font-semibold text-ink-800">Guests</label>
        <input
          type="number"
          min={1}
          max={20}
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="bg-transparent text-sm text-ink-700 outline-none"
        />
      </div>
      <button
        type="submit"
        className="flex items-center justify-center gap-2 rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink-800 sm:ml-2"
      >
        <Icon name="search" /> Search
      </button>
    </form>
  );
}
