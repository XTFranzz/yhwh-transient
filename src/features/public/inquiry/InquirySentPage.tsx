import { Link, useLocation } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";

interface LocationState {
  listingTitle?: string;
}

export function InquirySentPage() {
  const location = useLocation();
  const { listingTitle } = (location.state as LocationState) ?? {};

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-20 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-900 text-3xl text-white">
        <Icon name="chat-dots-fill" />
      </span>
      <h1 className="text-2xl font-semibold text-ink-900">Inquiry sent!</h1>
      <p className="max-w-md text-ink-600">
        {listingTitle ? (
          <>
            Thanks for your interest in <strong className="text-ink-900">{listingTitle}</strong>. Our team will
            reach out by email or phone shortly to confirm availability and arrange payment.
          </>
        ) : (
          "Thanks for reaching out. Our team will contact you shortly to confirm availability and arrange payment."
        )}
      </p>
      <p className="text-sm text-ink-500">No payment is needed until we've confirmed the details with you.</p>
      <div className="mt-4 flex gap-3">
        <Link to="/">
          <Button>Back to home</Button>
        </Link>
        <Link to="/#contact">
          <Button variant="outline">Contact us directly</Button>
        </Link>
      </div>
    </div>
  );
}
