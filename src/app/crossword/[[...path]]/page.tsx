import { permanentRedirect } from 'next/navigation';

type Props = {
  params: Promise<{ path?: string[] }>;
};

/** Legacy `/crossword/*` URLs → `/padajala/*` after the rename. */
export default async function CrosswordLegacyRedirect({ params }: Props) {
  const { path } = await params;
  const suffix = path?.length ? `/${path.map(encodeURIComponent).join('/')}` : '';
  permanentRedirect(`/padajala${suffix}`);
}
