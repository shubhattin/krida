import './globals.css';
import './app.scss';
import { ThemeProvider } from '@/components/theme-provider';
import { robotoSans } from '@/components/fonts';
import { cn } from '@/lib/utils';
import AppBar from '@/components/ui/app-bar';
import Provider from '@/api/TRPCProvider';
import { Toaster } from '@/components/ui/sonner';
import { Metadata } from 'next';

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark" style={{ colorScheme: 'dark' }}>
      <body
        className={cn(
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
          <div className="contaiiner mx-auto mb-1 max-w-screen-lg">
            <AppBar title="पदावली" />
            <Provider>
              <div className="mx-2">{children}</div>
              <Toaster richColors={true} />
            </Provider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

export const runtime = 'edge';

export const metadata: Metadata = {
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico'
  }
};
