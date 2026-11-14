import { useCallback, useEffect, useRef, useState } from "react";
import api from "./api.js";

// A list that loads a batch at a time as the shopper scrolls (LoadMore
// below the list calls loadMore). urlFor(page) is the request for one
// batch; when it changes for page 1 (a new search, filter or category),
// the list starts over. startPage: the first batch to show (a ?page= link).
//   items, meta (last answer's), loading (first batch), loadingMore,
//   hasMore, page, loadMore(), refresh() — refetches what's loaded, quietly
const REFRESH_PAGES = 4; // a background refresh rechecks the first few batches

const cancelled = (err) => err?.name === "CanceledError" || err?.code === "ERR_CANCELED";
const merge = (a, b) => {
  const seen = new Set(a.map((i) => i.id));
  return [...a, ...b.filter((i) => !seen.has(i.id))];
};

export default function useInfiniteList(urlFor, { enabled = true, startPage = 1, onError } = {}) {
  const key = enabled ? urlFor(startPage) : null;
  const [state, setState] = useState({ key: null, items: [], meta: null, page: startPage });
  // The list a next batch is loading for (a new list isn't loading more)
  const [moreFor, setMoreFor] = useState(null);
  const request = useRef(null);
  const latest = useRef({ urlFor, startPage, onError });
  useEffect(() => {
    latest.current = { urlFor, startPage, onError };
  });

  const fail = (err) => {
    if (cancelled(err)) return;
    console.error("Failed to load the list:", err);
    latest.current.onError?.(err);
  };

  // A new list: the first batch
  useEffect(() => {
    if (!key) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    api
      .get(key, { signal: controller.signal })
      .then((res) =>
        setState({ key, items: res.data.data || [], meta: res.data.meta || null, page: latest.current.startPage }),
      )
      .catch((err) => {
        fail(err);
        if (!cancelled(err)) setState({ key, items: [], meta: null, page: latest.current.startPage });
      });
    return () => controller.abort();
  }, [key]);

  const ready = state.key === key && !!key;
  const hasMore = ready && !!state.meta && state.page < state.meta.totalPages;
  const loadingMore = ready && moreFor === state.key;

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    const listKey = state.key;
    const next = state.page + 1;
    const controller = new AbortController();
    request.current = controller;
    setMoreFor(listKey);
    api
      .get(latest.current.urlFor(next), { signal: controller.signal })
      .then((res) =>
        setState((s) =>
          s.key === listKey
            ? { ...s, items: merge(s.items, res.data.data || []), meta: res.data.meta || s.meta, page: next }
            : s,
        ),
      )
      .catch(fail)
      .finally(() => setMoreFor((k) => (k === listKey ? null : k)));
  }, [hasMore, loadingMore, state.key, state.page]);

  // Background refresh: the first batches again, the rest kept as they are
  const refresh = useCallback(() => {
    if (!ready || loadingMore) return;
    const listKey = state.key;
    const { urlFor: url, startPage: first } = latest.current;
    const pages = [];
    for (let p = first; p <= Math.min(state.page, first + REFRESH_PAGES - 1); p++) pages.push(p);
    Promise.all(pages.map((p) => api.get(url(p))))
      .then((answers) =>
        setState((s) => {
          if (s.key !== listKey) return s;
          const fresh = answers.reduce((all, res) => merge(all, res.data.data || []), []);
          const perPage = answers[0]?.data.meta?.limit || fresh.length;
          const rest = s.items.slice(pages.length * perPage);
          return { ...s, items: merge(fresh, rest), meta: answers[answers.length - 1]?.data.meta || s.meta };
        }),
      )
      .catch(() => {});
  }, [ready, loadingMore, state.key, state.page]);

  return {
    items: ready ? state.items : [],
    meta: ready ? state.meta : null,
    loading: !!key && !ready,
    loadingMore,
    hasMore,
    // The last batch shown (its ?page=)
    page: ready ? state.page : startPage,
    loadMore,
    refresh,
  };
}
