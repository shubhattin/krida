import { MenuButton } from '~/components/app-bar/AppBarMenu';
import { robotoSans } from '../fonts';
import SupportOptions from '~/components/app-bar/SupportOptions';

export default function AppBar({ title }: { title: string }) {
  return (
    <header className="w-full bg-white shadow-sm dark:bg-gray-900">
      <div className="mx-auto flex h-15 max-w-4xl items-center justify-between px-3.5">
        <div className={`text-2xl font-bold ${robotoSans.className}`}>{title}</div>
        <div>
          <SupportOptions />
          <MenuButton />
        </div>
      </div>
    </header>
  );
}
