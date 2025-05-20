import './globals.css';
import './app.scss';
import { ThemeProvider } from '@/components/theme-provider';
import { robotoSans } from '@/components/fonts';
import { cn } from '@/lib/utils';
import AppBar from '@/components/ui/app-bar';
import Provider from '@/api/TRPCProvider';
import { headers } from 'next/headers';
import get_seesion_from_cookie from '~/lib/get_auth_from_cookie';

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await get_seesion_from_cookie((await headers()).get('cookie') ?? '');

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
            <Provider user_info_init={session?.user}>
              <div className="mx-2">{children}</div>
            </Provider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

export const runtime = 'edge';
