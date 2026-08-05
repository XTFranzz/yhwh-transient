const FAQS = [
  {
    q: "How do I book a house?",
    a: "Pick your dates on any listing, fill in your details, and submit payment proof. We'll verify your payment and confirm your booking.",
  },
  {
    q: "What payment methods do you accept?",
    a: "GCash and bank transfer. After paying, upload a screenshot of your receipt on the payment page.",
  },
  {
    q: "How long does payment verification take?",
    a: "Usually within a few hours. You can check your booking status anytime using your reference number and email.",
  },
  {
    q: "Can I cancel or change my dates?",
    a: "Message us with your booking reference and we'll help you out — cancellation terms depend on how close it is to your check-in date.",
  },
  {
    q: "What time is check-in and check-out?",
    a: "This varies per house and is listed on each listing's detail page, typically 2:00 PM check-in and 11:00 AM–12:00 PM check-out.",
  },
];

export function FaqPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-ink-900">Frequently asked questions</h1>
      <div className="mt-8 flex flex-col divide-y divide-ink-100">
        {FAQS.map((item) => (
          <details key={item.q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-ink-900">
              {item.q}
              <span className="text-ink-400 transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm text-ink-600">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
