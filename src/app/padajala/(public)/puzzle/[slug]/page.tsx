import { permanentRedirect } from 'next/navigation';

type Props = { params: Promise<{ slug: string }> };

export default async function CrosswordPuzzleSlugRedirect({ params }: Props) {
  const slug = decodeURIComponent((await params).slug);
  permanentRedirect(`/padajala/${encodeURIComponent(slug)}`);
}
