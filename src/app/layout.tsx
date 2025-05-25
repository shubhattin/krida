import './globals.css';
import './app.scss';
import { ThemeProvider } from '@/components/theme-provider';
import { robotoSans, notoSansDevanagari } from '@/components/fonts';
import { cn } from '@/lib/utils';
import AppBar from '~/components/app-bar/AppBar';
import Provider from '@/api/TRPCProvider';
import { Toaster } from '@/components/ui/sonner';
import { Metadata } from 'next';
import PosthogInit from '~/components/PosthogInit';
import { get_lang_from_cookie, SCRIPT_DATA_COOKIE_KEY } from '~/state/script_font_data';
import { cookies } from 'next/headers';

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const script = get_lang_from_cookie((await cookies()).get(SCRIPT_DATA_COOKIE_KEY)?.value);

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
          <div className="contaiiner mx-auto mb-1 max-w-screen-lg">
            <AppBar title="Padavali" />
            <Provider script={script}>
              <div className="mx-2">{children}</div>
              <Toaster richColors={true} />
            </Provider>
          </div>
        </ThemeProvider>
        <PosthogInit />
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
