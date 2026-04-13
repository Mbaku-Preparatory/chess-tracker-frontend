"use client";

import { useEffect, useRef, useState } from "react";
import { FEDERATIONS } from "@/lib/federations";

interface Props {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}

export function FederationSelect({ value, onChange, id }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Keep query in sync when value changes externally
  useEffect(() => {
    const fed = FEDERATIONS.find((f) => f.code === value);
    setQuery(fed ? `${fed.flag} ${fed.code} — ${fed.name}` : value);
  }, [value]);

  const filtered = query.trim() === "" || FEDERATIONS.some((f) => f.code === value && `${f.flag} ${f.code} — ${f.name}` === query)
    ? FEDERATIONS
    : FEDERATIONS.filter((f) => {
        const q = query.toLowerCase();
        return (
          f.code.toLowerCase().startsWith(q) ||
          f.name.toLowerCase().includes(q) ||
          f.flag.startsWith(q)
        );
      });

  function selectFed(code: string) {
    const fed = FEDERATIONS.find((f) => f.code === code);
    if (fed) {
      setQuery(`${fed.flag} ${fed.code} — ${fed.name}`);
      onChange(code);
    }
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    onChange(""); // clear committed value while typing
    setOpen(true);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && filtered[activeIndex]) {
        selectFed(filtered[activeIndex].code);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleBlur() {
    // If user typed something that doesn't match a federation, clear
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        const fed = FEDERATIONS.find((f) => f.code === value);
        setQuery(fed ? `${fed.flag} ${fed.code} — ${fed.name}` : "");
        if (!fed) onChange("");
        setOpen(false);
      }
    }, 150);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        spellCheck={false}
        placeholder="e.g. NOR or Norway"
        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-autocomplete="list"
      />
      {/* Clear button */}
      {query && (
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault();
            setQuery("");
            onChange("");
            setOpen(true);
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="Clear"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg text-sm"
        >
          {filtered.map((f, i) => (
            <li
              key={f.code}
              role="option"
              aria-selected={f.code === value}
              onMouseDown={(e) => {
                e.preventDefault();
                selectFed(f.code);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 ${
                i === activeIndex
                  ? "bg-brand-50 text-brand-700"
                  : f.code === value
                  ? "bg-gray-50 text-gray-900"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="text-base leading-none">{f.flag}</span>
              <span className="font-mono text-xs font-semibold text-gray-500 w-8 shrink-0">{f.code}</span>
              <span className="truncate">{f.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
