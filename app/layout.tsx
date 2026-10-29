import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KAST Pay',
  description: 'Pay with any wallet. Settles into KAST custody.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
