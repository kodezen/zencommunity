import { useCallback, useEffect, useRef, useState } from "react";
import { __ } from '@wordpress/i18n';
import { Flex, Button, Box, Text } from "@chakra-ui/react";
import { useSelector } from "react-redux";
import { useQuery } from "@Utils/helper";

/**
 * Custom hook for infinite scrolling with a simple two-prop API.
 *
 * @param {Object}   config
 * @param {Array}    config.data               - Items to render (caller-managed)
 * @param {Function} config.fetchPage          - async (page, isRefresh) => { hasMore, total }
 * @param {Function} config.renderItem         - (item, itemRef) => JSX  — apply ref={itemRef} to outermost wrapper
 * @param {Function} [config.renderSkeleton]   - () => JSX skeleton
 * @param {boolean}  [config.isInfiniteLoader] - Enable auto-load on scroll (default true)
 * @param {string}   [config.refreshBtnLabel]
 * @param {string}   [config.emptyLabel]
 * @param {string}   [config.noMoreLabel]
 *
 * @returns {{ renderContent, loading, refresh }}
 */
export default function useInfiniteLoader({
    isInfiniteLoader = true,
    data = [],
    renderItem = () => null,
    renderSkeleton,
    refreshBtnLabel = __("🔄 Refresh", "zencommunity"),
    emptyLabel = __("No posts found", "zencommunity"),
    noMoreLabel = __("No more posts", "zencommunity"),
    fetchPage,
}) {
    const { is_new_feeds_available, new_feeds_count } = useSelector(state => state.ticker);

    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [initialTotal, setInitialTotal] = useState(null);
    const [newPostCount, setNewPostCount] = useState(0);
    const [showNewPostButton, setShowNewPostButton] = useState(false);

    const observer = useRef();
    const refreshTrigger = useRef(false);
    const scrollAnchorRef = useRef(null);
    const location = useQuery();

    const markerId = "scroll-back-marker";
    const searchKey = location.get('search') || null;

    const getScrollableParent = (node) => {
        while (node && node !== document.body) {
            const style = window.getComputedStyle(node);
            const overflowY = style.overflowY;
            if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node;
            node = node.parentElement;
        }
        return window;
    };

    const findClosestVisibleIndex = () => {
        const elements = document.querySelectorAll(".zc-post-card");
        for (let i = 0; i < elements.length; i++) {
            if (elements[i].getBoundingClientRect().top > 0) return i;
        }
        return null;
    };

    // Core internal fetch runner — callers never call this directly
    const runFetch = async (pageToLoad, isRefresh = false) => {
        if (loading && !isRefresh) return;
        setLoading(true);
        try {
            const result = await fetchPage(pageToLoad, isRefresh);
            const { hasMore: nextHasMore = false, total = 0 } = result ?? {};

            setHasMore(nextHasMore);

            if (pageToLoad === 1) {
                setInitialTotal(total);
            } else if (initialTotal !== null && total > initialTotal) {
                setNewPostCount(total - initialTotal);
                setShowNewPostButton(true);
                const index = findClosestVisibleIndex();
                if (index !== null) {
                    const posts = document.querySelectorAll(".zc-post-card");
                    const targetPost = posts[index];
                    const marker = document.createElement("div");
                    marker.id = markerId;
                    targetPost.parentNode.insertBefore(marker, targetPost);
                }
            }
        } catch (err) {
            // silently handle
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Main loader effect
    useEffect(() => {
        if (refreshTrigger.current) {
            runFetch(1, true).then(() => { refreshTrigger.current = false; });
        } else {
            runFetch(page, false);
        }
    }, [page]);

    // Watch scroll marker for "new posts" banner auto-dismiss
    useEffect(() => {
        const marker = document.getElementById(markerId);
        if (!marker || !showNewPostButton) return;
        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    const timeout = setTimeout(() => {
                        setShowNewPostButton(false);
                        marker.remove();
                    }, 10000);
                    return () => clearTimeout(timeout);
                }
            },
            { threshold: 0.1 }
        );
        obs.observe(marker);
        return () => obs.disconnect();
    }, [showNewPostButton]);

    useEffect(() => {
        if (is_new_feeds_available) setNewPostCount(new_feeds_count);
    }, [is_new_feeds_available]);

    useEffect(() => {
        if (refreshing && data.length > 0) {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [refreshing, data]);

    // IntersectionObserver ref for last item — passed to renderItem as itemRef
    const lastPostRef = useCallback(node => {
        if (!isInfiniteLoader) return;
        if (loading || refreshing || searchKey) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new window.IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prev => prev + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore, refreshing, isInfiniteLoader]);

    useEffect(() => {
        const homeLinkBtn = document.querySelector("#home-link");
        if (homeLinkBtn) homeLinkBtn.addEventListener("click", handleRefresh);
    }, []);

    const scrollToTop = () => {
        if (!scrollAnchorRef.current) return;
        getScrollableParent(scrollAnchorRef.current).scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleRefresh = () => {
        refreshTrigger.current = true;
        setRefreshing(true);
        setPage(1);
        setShowNewPostButton(false);
        setNewPostCount(0);
        setInitialTotal(null);
        scrollToTop();
        if (page === 1) {
            runFetch(1, true).then(() => {
                refreshTrigger.current = false;
                const old = document.getElementById(markerId);
                if (old) old.remove();
            });
        }
    };

    const handleLoadMore = () => {
        if (!loading && hasMore) setPage(prev => prev + 1);
    };

    const renderContent = () => (
        <Box ref={scrollAnchorRef}>
            {showNewPostButton && newPostCount && (
                <Button
                    position="fixed"
                    top="10%"
                    left="50%"
                    transform="translateX(-50%)"
                    zIndex="999"
                    bg="blue.500"
                    color="white"
                    fontWeight="bold"
                    onClick={handleRefresh}
                    isDisabled={refreshing}
                >
                    {newPostCount} new post{newPostCount > 1 ? "s" : ""} available
                </Button>
            )}

            {data.length === 0 && loading && renderSkeleton ? (
                renderSkeleton()
            ) : (
                <>
                    {data.length > 0 ? (
                        data.map((item, index) => {
                            const itemRef = index === data.length - 1 ? lastPostRef : undefined;
                            return renderItem(item, itemRef);
                        })
                    ) : (
                        <Flex align="center" justify="center" my={8}>
                            <Text color="gray.500">{emptyLabel}</Text>
                        </Flex>
                    )}

                    {loading && page > 1 && renderSkeleton && renderSkeleton()}

                    {!loading && hasMore && !isInfiniteLoader && (
                        <Flex align="center" justify="center">
                            <Button onClick={handleLoadMore} colorScheme="blue">
                                {__("Read more", "zencommunity")}
                            </Button>
                        </Flex>
                    )}

                    {!hasMore && (
                        <Flex align="center" justify="center" mt={6}>
                            <Text fontSize="sm" color="gray.500">{noMoreLabel}</Text>
                        </Flex>
                    )}
                </>
            )}
        </Box>
    );

    return { renderContent, loading, refresh: handleRefresh };
}
