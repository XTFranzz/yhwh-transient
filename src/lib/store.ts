import { create } from "zustand";

interface BookingDraft {
  listingSlug: string | null;
  checkIn: string | null;
  checkOut: string | null;
  guestCount: number;
  guest: { fullName: string; email: string; phone: string };
  guestNotes: string;
}

interface BookingDraftStore {
  draft: BookingDraft;
  setDates: (checkIn: string, checkOut: string) => void;
  setListing: (slug: string) => void;
  setGuestCount: (count: number) => void;
  setGuestInfo: (guest: BookingDraft["guest"]) => void;
  setGuestNotes: (notes: string) => void;
  reset: () => void;
}

const emptyDraft: BookingDraft = {
  listingSlug: null,
  checkIn: null,
  checkOut: null,
  guestCount: 1,
  guest: { fullName: "", email: "", phone: "" },
  guestNotes: "",
};

export const useBookingDraftStore = create<BookingDraftStore>((set) => ({
  draft: emptyDraft,
  setDates: (checkIn, checkOut) => set((s) => ({ draft: { ...s.draft, checkIn, checkOut } })),
  setListing: (slug) => set((s) => ({ draft: { ...s.draft, listingSlug: slug } })),
  setGuestCount: (guestCount) => set((s) => ({ draft: { ...s.draft, guestCount } })),
  setGuestInfo: (guest) => set((s) => ({ draft: { ...s.draft, guest } })),
  setGuestNotes: (guestNotes) => set((s) => ({ draft: { ...s.draft, guestNotes } })),
  reset: () => set({ draft: emptyDraft }),
}));

interface ReservationsFilterStore {
  status: string | null;
  setStatus: (status: string | null) => void;
}

export const useReservationsFilterStore = create<ReservationsFilterStore>((set) => ({
  status: null,
  setStatus: (status) => set({ status }),
}));
