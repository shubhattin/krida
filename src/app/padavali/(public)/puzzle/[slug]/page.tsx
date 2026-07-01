import { permanentRedirect } from 'next/navigation';

type Props = { params: Promise<{ slug: string }> };

export default async function PuzzleSlugRedirect({ params }: Props) {
  const slug = decodeURIComponent((await params).slug);
  permanentRedirect(`/padavali/${encodeURIComponent(slug)}`);
}
