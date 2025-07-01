import './globals.css';
import './app.scss';
import { ThemeProvider } from '@/components/theme-provider';
import { robotoSans, notoSansDevanagari } from '@/components/fonts';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/sonner';
import { Metadata } from 'next';
import PosthogInit from '~/components/tags/PosthogInit';

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark" style={{ colorScheme: 'dark' }}>
      <body
        className={cn(
          notoSansDevanagari.className,
          robotoSans.className,
          'antialiased',
          'overflow-y-scroll sm:px-2 lg:px-3 xl:px-4 2xl:px-4'
        )}
      >
        <ThemeProvider
          attribute={['class']}
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="container mx-auto mb-1">
            <Toaster richColors={true} />
            {children}
          </div>
        </ThemeProvider>
        <PosthogInit />
      </body>
    </html>
  );
}

// export const runtime = 'edge';

export const metadata: Metadata = {
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico'
  },
  manifest: '/manifest.json',
  appleWebApp: {
    title: 'Padavali',
    statusBarStyle: 'black-translucent'
  }
};
