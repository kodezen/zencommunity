import { useEffect, useRef, useCallback } from "react";

export const useScrollFetchData = (
  data = [],
  meta,
  fetchDataFn,
  loading,
  scrollContainer
) => {
  const observerRef = useRef(null);
  const isDoneRef = useRef(false);

  const handleIntersect = useCallback(
    (entries) => {
      const entry = entries[0];
      if (isDoneRef.current || loading) return;

      const morePages = Number(meta?.page) < Number(meta?.pages);
      if (!morePages) return;

      if (entry.isIntersecting) {
        fetchDataFn(meta.page + 1);
        isDoneRef.current = true;
        observerRef.current?.disconnect();
      }
    },
    [loading, meta, fetchDataFn]
  );

  const attachObserver = useCallback(() => {
    const container = scrollContainer?.current;
    if (!container) return;

    const firstNode = container.querySelector("[data-first-item='true']");
    const lastNode = container.querySelector("[data-last-item='true']");

    if (observerRef.current) observerRef.current.disconnect();
    if (Number(meta?.page) >= Number(meta?.pages)) {
      isDoneRef.current = true;
      return;
    }

    isDoneRef.current = false;
    observerRef.current = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin: "100px",
      threshold: 0.1,
    });

    if (firstNode) observerRef.current.observe(firstNode);
    if (lastNode) observerRef.current.observe(lastNode);
  }, [scrollContainer, handleIntersect, meta]);

  const dataLength = data?.length ?? 0;

  useEffect(() => {
    if (!dataLength) return;
    const timer = setTimeout(() => attachObserver(), 100);
    return () => clearTimeout(timer);
    // Re-attaching re-triggers IntersectionObserver's initial "am I already
    // visible?" callback, which fires a real page fetch if the sentinel is on
    // screen. Depending on the array reference (instead of its length) meant
    // any in-place edit to an item's content - which produces a new array
    // reference via .map() without changing item count - re-armed the
    // observer and fired that spurious fetch, reordering the list.
  }, [dataLength, scrollContainer, attachObserver]);

  return { firstElementRef: () => { } };
};
