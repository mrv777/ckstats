import './globals.css';
import { Inter } from 'next/font/google';
import Header from '../components/Header';
import { Metadata } from 'next';
import Providers from '../components/Providers';
import LoadingOverlay from '../components/LoadingOverlay';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CKstats',
  description:
    'Real-time and historical statistics for the CKPool Bitcoin mining pool using data from their API.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <LoadingOverlay />
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
