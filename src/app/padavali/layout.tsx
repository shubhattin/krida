import { type ReactNode } from 'react';
import AppBar from '~/components/app-bar/AppBar';

export default function PadavaliLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppBar title="Padavali" />
      <div className="mx-2">{children}</div>
    </>
  );
}
