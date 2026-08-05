import { Link, useParams } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";

export function BookingConfirmationPage() {
  const { reference = "" } = useParams();

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-20 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-900 text-3xl text-white">
        <Icon name="check-lg" />
      </span>
      <h1 className="text-2xl font-semibold text-ink-900">Payment received!</h1>
      <p className="text-ink-600">
        Thanks for submitting your payment. Our team will verify it and confirm your booking shortly.
      </p>
      <div className="rounded-2xl border border-ink-100 bg-ink-50 px-6 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Booking reference</p>
        <p className="text-xl font-semibold text-ink-900">{reference}</p>
      </div>
      <p className="text-sm text-ink-500">Save this reference number — you'll need it to check your booking status.</p>
      <div className="mt-4 flex gap-3">
        <Link to="/my-booking">
          <Button variant="outline">Manage my booking</Button>
        </Link>
        <Link to="/">
          <Button>Back to home</Button>
        </Link>
      </div>
    </div>
  );
}
