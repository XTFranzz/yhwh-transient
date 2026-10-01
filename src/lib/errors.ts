// Convex wraps a thrown Error's message with request-id/stack-trace noise,
// e.g. '[CONVEX M(bookings:createByStaff)] [Request ID: ...] Server Error\nUncaught Error: Selected dates are no longer available\n    at ...'.
// Staff only need the part after "Uncaught Error:" — this pulls just that out
// for display in an ErrorBanner, instead of the raw wrapper text.
export function getErrorMessage(err: unknown, fallback = "Something went wrong."): string {
  if (!(err instanceof Error)) return fallback;
  const match = err.message.match(/Uncaught Error:\s*([^\n]+)/);
  if (match) return match[1].trim();
  return err.message.split("\n")[0].trim() || fallback;
}
