import type { Metadata, Viewport } from 'next';
import './globals.css';
import { StoreProvider } from '@/lib/store';
import { Toaster } from '@/components/Toaster';

export const metadata: Metadata = {
  title: 'MITRA — Digital Citizen Assistant',
  description:
    'MITRA (Multilingual Intelligent Technology for Responsive Assistance) helps every Indian citizen find, understand and apply for government schemes in their own language.',
  applicationName: 'MITRA',
  authors: [{ name: 'MITRA — Smart India Hackathon 2026' }],
  keywords: ['government schemes', 'India', 'multilingual', 'citizen services', 'welfare'],
};

export const viewport: Viewport = {
  themeColor: '#4F46E5',
  width: 'device-width',
  initialScale: 1,
  // Never lock zoom: citizens with low vision must be able to scale the interface.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-brand-500 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        <StoreProvider>
          {children}
          {/* Connection and save status. Lives at the root so it survives route changes
              and is present in the accessibility tree before any message arrives. */}
          <Toaster />
        </StoreProvider>
      </body>
    </html>
  );
}
