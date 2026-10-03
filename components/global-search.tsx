'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

type Hit = { id: string; title: string; sub: string; href: string };
type Results = { tasks: Hit[]; datasets: Hit[]; records: Hit[] };

const EMPTY: Results = { tasks: [], datasets: [], records: [] };

/** Topbar search across tasks, datasets and records. Cmd/Ctrl+K focuses it. */
export function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Results>(EMPTY);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return; // the dropdown only renders for 2+ chars
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        setResults(await res.json());
      } catch {
        // aborted or offline: keep the previous results
      }
    }, 150);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClickOutside);
    return () => window.removeEventListener('mousedown', onClickOutside);
  }, []);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery('');
      router.push(href);
    },
    [router],
  );

  const groups: Array<[string, Hit[]]> = [
    ['Tasks', results.tasks],
    ['Datasets', results.datasets],
    ['Records', results.records],
  ];
  const total = results.tasks.length + results.datasets.length + results.records.length;

  return (
    <div className="search" ref={boxRef}>
      <span className="search-icon">
        <Search size={14} />
      </span>
      <input
        ref={inputRef}
        className="search-input"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
            inputRef.current?.blur();
          }
          if (e.key === 'Enter') {
            const first = groups.flatMap(([, hits]) => hits)[0];
            if (first) go(first.href);
          }
        }}
        placeholder="Search tasks, datasets, records"
        aria-label="Search"
      />
      <span className="search-kbd">⌘K</span>

      {open && query.trim().length >= 2 ? (
        <div className="search-pop" role="listbox">
          {total === 0 ? <div className="search-empty">No matches.</div> : null}
          {groups.map(([label, hits]) =>
            hits.length ? (
              <div key={label}>
                <div className="search-group">{label}</div>
                {hits.map((hit) => (
                  <a
                    key={hit.id}
                    className="search-item"
                    href={hit.href}
                    onClick={(e) => {
                      e.preventDefault();
                      go(hit.href);
                    }}
                  >
                    <div>{hit.title}</div>
                    <div className="sub">{hit.sub}</div>
                  </a>
                ))}
              </div>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}
