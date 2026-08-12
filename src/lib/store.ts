import { create } from "zustand";

interface InquiryDraft {
  listingSlug: string | null;
  checkIn: string | null;
  checkOut: string | null;
  guestCount: number;
  customer: { fullName: string; email: string; phone: string };
  notes: string;
}

interface InquiryDraftStore {
  draft: InquiryDraft;
  setDates: (checkIn: string, checkOut: string) => void;
  setListing: (slug: string) => void;
  setGuestCount: (count: number) => void;
  setCustomerInfo: (customer: InquiryDraft["customer"]) => void;
  setNotes: (notes: string) => void;
  reset: () => void;
}

const emptyDraft: InquiryDraft = {
  listingSlug: null,
  checkIn: null,
  checkOut: null,
  guestCount: 1,
  customer: { fullName: "", email: "", phone: "" },
  notes: "",
};

export const useInquiryDraftStore = create<InquiryDraftStore>((set) => ({
  draft: emptyDraft,
  setDates: (checkIn, checkOut) => set((s) => ({ draft: { ...s.draft, checkIn, checkOut } })),
  setListing: (slug) => set((s) => ({ draft: { ...s.draft, listingSlug: slug } })),
  setGuestCount: (guestCount) => set((s) => ({ draft: { ...s.draft, guestCount } })),
  setCustomerInfo: (customer) => set((s) => ({ draft: { ...s.draft, customer } })),
  setNotes: (notes) => set((s) => ({ draft: { ...s.draft, notes } })),
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
