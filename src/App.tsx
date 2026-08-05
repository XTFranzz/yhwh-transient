import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout";
import { AdminLayout } from "./layouts/AdminLayout";
import { AdminGuard } from "./routes/AdminGuard";

import { HomePage } from "./features/public/listings/HomePage";
import { SearchResultsPage } from "./features/public/listings/SearchResultsPage";
import { ListingDetailPage } from "./features/public/listings/ListingDetailPage";
import { VehiclesPage } from "./features/public/vehicles/VehiclesPage";
import { VehicleDetailPage } from "./features/public/vehicles/VehicleDetailPage";
import { ToursPage } from "./features/public/tours/ToursPage";
import { TourDetailPage } from "./features/public/tours/TourDetailPage";
import { BookingReviewPage } from "./features/public/booking/BookingReviewPage";
import { BookingPaymentPage } from "./features/public/booking/BookingPaymentPage";
import { BookingConfirmationPage } from "./features/public/booking/BookingConfirmationPage";
import { BookingLookupPage } from "./features/public/lookup/BookingLookupPage";
import { ContactPage } from "./features/public/info/ContactPage";
import { FaqPage } from "./features/public/info/FaqPage";

import { LoginPage } from "./features/admin/auth/LoginPage";
import { DashboardPage } from "./features/admin/dashboard/DashboardPage";
import { ListingsListPage } from "./features/admin/listings/ListingsListPage";
import { ListingFormPage } from "./features/admin/listings/ListingFormPage";
import { ReservationsListPage } from "./features/admin/reservations/ReservationsListPage";
import { ReservationDetailPage } from "./features/admin/reservations/ReservationDetailPage";
import { PaymentsQueuePage } from "./features/admin/payments/PaymentsQueuePage";
import { CustomersListPage } from "./features/admin/customers/CustomersListPage";
import { StaffListPage } from "./features/admin/staff/StaffListPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/listings/:slug" element={<ListingDetailPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/vehicles/:slug" element={<VehicleDetailPage />} />
          <Route path="/tours" element={<ToursPage />} />
          <Route path="/tours/:slug" element={<TourDetailPage />} />
          <Route path="/book/:slug/review" element={<BookingReviewPage />} />
          <Route path="/book/:reference/payment" element={<BookingPaymentPage />} />
          <Route path="/book/:reference/confirmation" element={<BookingConfirmationPage />} />
          <Route path="/my-booking" element={<BookingLookupPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/faqs" element={<FaqPage />} />
        </Route>

        <Route path="/admin/login" element={<LoginPage />} />
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminLayout />
            </AdminGuard>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="reservations" element={<ReservationsListPage />} />
          <Route path="reservations/:bookingId" element={<ReservationDetailPage />} />
          <Route path="listings" element={<ListingsListPage />} />
          <Route path="listings/new" element={<ListingFormPage />} />
          <Route path="listings/:listingId/edit" element={<ListingFormPage />} />
          <Route path="payments" element={<PaymentsQueuePage />} />
          <Route path="customers" element={<CustomersListPage />} />
          <Route
            path="staff"
            element={
              <AdminGuard roles={["owner_admin"]}>
                <StaffListPage />
              </AdminGuard>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
