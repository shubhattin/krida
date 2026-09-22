/** Extra space above the list when scrolling the page (sticky header / breathing room). */
const PAGE_SCROLL_OFFSET_PX = 96;

/**
 * Scroll a paginated list back to its start after a page change.
 * Overflow containers reset scrollTop; otherwise the page scrolls so the list
 * sits slightly below the top of the viewport.
 */
export function scrollPaginationListToStart(target: HTMLElement | null | undefined) {
  if (!target) return;
  if (target.scrollHeight > target.clientHeight + 1) {
    target.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  const top = target.getBoundingClientRect().top + window.scrollY - PAGE_SCROLL_OFFSET_PX;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
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
