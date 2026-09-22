/**
 * Scroll a paginated list back to its start after a page change.
 * Overflow containers reset scrollTop; otherwise the element is scrolled into view.
 */
export function scrollPaginationListToStart(target: HTMLElement | null | undefined) {
  if (!target) return;
  if (target.scrollHeight > target.clientHeight + 1) {
    target.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Wrap a page setter so it also scrolls the list to the start. */
export function withPaginationListScroll(
  onPageChange: (page: number) => void,
  listRef: { current: HTMLElement | null }
) {
  return (page: number) => {
    onPageChange(page);
    scrollPaginationListToStart(listRef.current);
  };
}
