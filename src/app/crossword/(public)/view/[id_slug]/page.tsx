import { type Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { cache } from 'react';
import CrossWordGameRoot from '~/components/pages/cross_word/CrossWordGame/CrossWordGameRoot';
import { CACHE } from '~/util/cache.server/cache_loaders';
import { getMetadata } from '~/components/tags/getPageMetaTags';
import { parseIdSlugParam } from '~/util/puzzle/slug';
import { PreviewWarningBanner } from './PreviewWarningBanner';

type Props = { params: Promise<{ id_slug: string }> };

const word_puzzle_get_cached_func = cache((params: { slug: string }) =>
  CACHE.crossword.word_puzzle.get(params)
);

const parseParams = async (params: Promise<{ id_slug: string }>) => {
  const parsed = parseIdSlugParam((await params).id_slug);
  if (!parsed) return null;
  return parsed;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const routeParams = await parseParams(params);
  if (!routeParams) {
    return getMetadata({ title: 'Not Found', description: null });
  }

  const word_puzzle = await word_puzzle_get_cached_func({ slug: routeParams.slug });
  const isValid = word_puzzle && word_puzzle.id === routeParams.id;

  return {
    ...getMetadata({
      title: isValid ? `${word_puzzle.title} | Crossword` : 'Not Found',
      description: isValid ? word_puzzle.description : null
    }),
    robots: 'noindex'
  };
}

export default async function CrosswordPreviewPage({ params }: Props) {
  const routeParams = await parseParams(params);
  if (!routeParams) {
    return <div className="p-8 text-center">Invalid ID</div>;
  }

  const { id, slug } = routeParams;
  const word_puzzle = await word_puzzle_get_cached_func({ slug });
  const isValid = word_puzzle && word_puzzle.id === id;

  return (
    <main className="relative min-h-dvh overflow-x-clip">
      {isValid ? (
        <>
          <PreviewWarningBanner listed={word_puzzle.listed} slug={word_puzzle.slug} />
          <div className="px-4 pt-3 sm:px-6 sm:pt-4">
            <Link
              href="/crossword"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-slate-700 no-underline shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowLeftIcon className="size-4" />
              Home Page
            </Link>
          </div>
          <CrossWordGameRoot
            puzzle={word_puzzle}
            location="view_page"
            attachments={word_puzzle.attachments}
            image={word_puzzle.image}
          />
        </>
      ) : (
        <div className="p-8 text-center">Invalid ID</div>
      )}
    </main>
  );
}
