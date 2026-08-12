import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Input } from "../../../components/ui/Input";
import { formatDate } from "../../../lib/format";

export interface CustomerValue {
  fullName: string;
  email: string;
  phone: string;
}

interface CustomerPickerProps {
  value: CustomerValue | null;
  onChange: (customer: CustomerValue) => void;
}

// Search-or-add widget shared by the reservation-creation flow. Matches are
// looked up by name/email/phone (never deduped by name — two different
// people can share a name), so every result row shows email + phone + last
// stay for disambiguation, nothing is ever auto-selected, and "+ Add as new
// customer" stays available next to the results rather than only appearing
// after a failed search.
export function CustomerPicker({ value, onChange }: CustomerPickerProps) {
  const [editing, setEditing] = useState(value === null);
  const [term, setTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [manual, setManual] = useState<CustomerValue>({ fullName: "", email: "", phone: "" });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setEditing(false);
  }, [value]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTerm(term), 300);
    return () => clearTimeout(t);
  }, [term]);

  const showResults = debouncedTerm.trim().length >= 2;
  const results = useQuery(api.customers.search, showResults ? { term: debouncedTerm } : "skip");

  useEffect(() => {
    if (!editing) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node) && value) {
        setEditing(false);
        setManualMode(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editing, value]);

  function selectCustomer(c: CustomerValue) {
    onChange(c);
    setEditing(false);
    setManualMode(false);
    setTerm("");
  }

  function startManual() {
    setManual({ fullName: term.trim(), email: "", phone: "" });
    setManualMode(true);
  }

  function confirmManual() {
    onChange(manual);
    setEditing(false);
    setManualMode(false);
    setTerm("");
  }

  if (!editing && value) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-ink-200 bg-ink-50 px-3.5 py-2.5">
        <div>
          <p className="text-sm font-medium text-ink-900">{value.fullName}</p>
          <p className="text-xs text-ink-500">
            {value.email} · {value.phone}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-2">
      {manualMode ? (
        <div className="flex flex-col gap-3 rounded-xl border border-ink-200 p-3.5">
          <Input
            label="Full name"
            value={manual.fullName}
            onChange={(e) => setManual((m) => ({ ...m, fullName: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              value={manual.email}
              onChange={(e) => setManual((m) => ({ ...m, email: e.target.value }))}
            />
            <Input
              label="Phone number"
              value={manual.phone}
              onChange={(e) => setManual((m) => ({ ...m, phone: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setManualMode(false)}
              className="text-xs font-medium text-ink-500 hover:text-ink-800"
            >
              Back to search
            </button>
            <button
              type="button"
              disabled={!manual.fullName.trim() || !manual.email.trim() || !manual.phone.trim()}
              onClick={confirmManual}
              className="rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Use these details
            </button>
          </div>
        </div>
      ) : (
        <>
          <Input
            placeholder="Search customers by name, email, or phone…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            autoFocus
          />
          {showResults && (
            <div className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-xl border border-ink-200 bg-white shadow-popover">
              {results === undefined ? (
                <p className="px-3.5 py-2.5 text-sm text-ink-400">Searching…</p>
              ) : results.length === 0 ? (
                <p className="px-3.5 py-2.5 text-sm text-ink-400">No matches.</p>
              ) : (
                results.map((c) => (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => selectCustomer({ fullName: c.fullName, email: c.email, phone: c.phone })}
                    className="flex w-full flex-col items-start gap-0.5 px-3.5 py-2.5 text-left text-sm hover:bg-ink-50"
                  >
                    <span className="font-medium text-ink-900">{c.fullName}</span>
                    <span className="text-xs text-ink-500">
                      {c.email} · {c.phone}
                      {c.lastStay && ` · Last stay: ${c.lastStay.listingTitle} (${formatDate(c.lastStay.startDate)})`}
                    </span>
                  </button>
                ))
              )}
              <button
                type="button"
                onClick={startManual}
                className="w-full border-t border-ink-100 px-3.5 py-2.5 text-left text-sm font-medium text-brand-600 hover:bg-brand-50"
              >
                + Add "{term.trim()}" as new customer
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
