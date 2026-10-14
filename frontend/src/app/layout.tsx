import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './Providers';

export const metadata: Metadata = {
  title: {
    template: `%s | ${process.env['NEXT_PUBLIC_APP_NAME'] ?? 'DMS'}`,
    default: process.env['NEXT_PUBLIC_APP_NAME'] ?? 'Dispensary Management System',
  },
  description: 'Dispensary Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
