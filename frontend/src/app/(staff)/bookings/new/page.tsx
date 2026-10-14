import type { Metadata } from 'next';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { BookingForm } from '@/features/bookings/BookingForm';

export const metadata: Metadata = { title: 'New Booking' };

export default function NewBookingPage() {
  return (
    <RequireAuth requiredRoles={['DOCTOR', 'PHARMACIST']}>
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold">New Booking</h1>
        <div className="max-w-lg">
          <BookingForm />
        </div>
      </div>
    </RequireAuth>
  );
}
