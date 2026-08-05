import { Icon } from "../../../components/ui/Icon";

const CONTACT_ITEMS = [
  { icon: "telephone-fill", label: "Phone / Viber / WhatsApp", value: "0917-123-4567" },
  { icon: "envelope-fill", label: "Email", value: "hello@yhwh-transient.example" },
  { icon: "clock-fill", label: "Office hours", value: "Daily, 8:00 AM – 8:00 PM" },
];

export function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-ink-900">Contact us</h1>
      <p className="mt-2 text-ink-600">
        Have questions about a house, availability, or your booking? Reach out and we'll get back to you.
      </p>
      <div className="mt-8 flex flex-col gap-6 rounded-2xl border border-ink-100 p-6">
        {CONTACT_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-300 text-brand-600">
              <Icon name={item.icon} />
            </span>
            <div>
              <p className="text-sm font-medium text-ink-900">{item.label}</p>
              <p className="text-sm text-ink-600">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
