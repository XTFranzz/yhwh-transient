import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout";
import { AdminLayout } from "./layouts/AdminLayout";
import { AdminGuard } from "./routes/AdminGuard";
import { SplashScreen } from "./components/SplashScreen";

import { HomePage } from "./features/public/listings/HomePage";
import { SearchResultsPage } from "./features/public/listings/SearchResultsPage";
import { ListingDetailPage } from "./features/public/listings/ListingDetailPage";
import { VehicleDetailPage } from "./features/public/vehicles/VehicleDetailPage";
import { TourDetailPage } from "./features/public/tours/TourDetailPage";
import { InquiryFormPage } from "./features/public/inquiry/InquiryFormPage";
import { InquirySentPage } from "./features/public/inquiry/InquirySentPage";
import { FaqPage } from "./features/public/info/FaqPage";

import { LoginPage } from "./features/admin/auth/LoginPage";
import { DashboardPage } from "./features/admin/dashboard/DashboardPage";
import { ListingsListPage } from "./features/admin/listings/ListingsListPage";
import { ListingFormPage } from "./features/admin/listings/ListingFormPage";
import { ReservationsListPage } from "./features/admin/reservations/ReservationsListPage";
import { ReservationDetailPage } from "./features/admin/reservations/ReservationDetailPage";
import { NewReservationPage } from "./features/admin/reservations/NewReservationPage";
import { InquiriesListPage } from "./features/admin/inquiries/InquiriesListPage";
import { InvoicesListPage } from "./features/admin/invoices/InvoicesListPage";
import { InvoiceDetailPage } from "./features/admin/invoices/InvoiceDetailPage";
import { PaymentsAnalyticsPage } from "./features/admin/payments/PaymentsAnalyticsPage";
import { CustomersListPage } from "./features/admin/customers/CustomersListPage";
import { CustomerDetailPage } from "./features/admin/customers/CustomerDetailPage";
import { StaffListPage } from "./features/admin/staff/StaffListPage";

export default function App() {
  return (
    <BrowserRouter>
      <SplashScreen />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/listings/:slug" element={<ListingDetailPage />} />
          <Route path="/vehicles/:slug" element={<VehicleDetailPage />} />
          <Route path="/tours/:slug" element={<TourDetailPage />} />
          <Route path="/inquire/:slug" element={<InquiryFormPage />} />
          <Route path="/inquiry-sent" element={<InquirySentPage />} />
          <Route path="/faqs" element={<FaqPage />} />

          {/* These are now sections on the one-page homepage; keep the old URLs working. */}
          <Route path="/about" element={<Navigate to="/#about" replace />} />
          <Route path="/vehicles" element={<Navigate to="/#vehicles" replace />} />
          <Route path="/tours" element={<Navigate to="/#tours" replace />} />
          <Route path="/my-booking" element={<Navigate to="/#my-booking" replace />} />
          <Route path="/contact" element={<Navigate to="/#contact" replace />} />
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
          <Route path="reservations/new" element={<NewReservationPage />} />
          <Route path="reservations/:bookingId" element={<ReservationDetailPage />} />
          <Route path="inquiries" element={<InquiriesListPage />} />
          <Route path="invoices" element={<InvoicesListPage />} />
          <Route path="invoices/:kind/:id" element={<InvoiceDetailPage />} />
          <Route path="listings" element={<ListingsListPage />} />
          <Route path="listings/new" element={<ListingFormPage />} />
          <Route path="listings/:listingId/edit" element={<ListingFormPage />} />
          <Route path="payments" element={<PaymentsAnalyticsPage />} />
          <Route path="customers" element={<CustomersListPage />} />
          <Route path="customers/:customerId" element={<CustomerDetailPage />} />
          <Route
            path="staff"
            element={
              <AdminGuard roles={["superadmin"]}>
                <StaffListPage />
              </AdminGuard>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
