import './globals.css';
import { Metadata } from 'next';
import { Lato } from 'next/font/google';

import Footer from '../components/Footer';
import Header from '../components/Header';
import Providers from '../components/Providers';

const lato = Lato({ subsets: ['latin'], weight: ['400', '700'] });

export const metadata: Metadata = {
  title: 'CKstats (hydrapool)',
  description: 'CKPool stats for Hydrapool. View your stats and hashrate.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={lato.className}>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
