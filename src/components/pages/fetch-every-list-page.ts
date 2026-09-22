export async function fetchEveryListPage<T>(
  loadPage: (page: number, size: number) => Promise<{ list: T[]; pageCount: number }>,
  size: number
) {
  const first = await loadPage(1, size);
  if (first.pageCount <= 1) return first.list;

  const rest = await Promise.all(
    Array.from({ length: first.pageCount - 1 }, (_, index) => loadPage(index + 2, size))
  );
  return [first.list, ...rest.map((page) => page.list)].flat();
}
