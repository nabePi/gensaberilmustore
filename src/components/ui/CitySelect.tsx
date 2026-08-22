'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { inputBase } from '@/lib/styles';

type City = { id: string; name: string; province: string };

export function CitySelect({
  cities,
  value,
  onChange,
  placeholder = 'Pilih Kota / Kabupaten',
  hasError = false,
  id,
}: {
  cities: City[];
  value: string;
  onChange: (cityId: string) => void;
  placeholder?: string;
  hasError?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCity = useMemo(() => cities.find((city) => city.id === value), [cities, value]);

  const filteredCities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter(
      (city) => city.name.toLowerCase().includes(q) || city.province.toLowerCase().includes(q),
    );
  }, [cities, query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function openDropdown() {
    setOpen(true);
    setQuery('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function selectCity(city: City) {
    onChange(city.id);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className={`${inputBase} flex items-center justify-between text-left ${
          hasError ? 'border-red' : ''
        }`}
      >
        <span className={selectedCity ? 'text-foreground' : 'text-neutral-400'}>
          {selectedCity ? `${selectedCity.name}, ${selectedCity.province}` : placeholder}
        </span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-neutral-400" fill="currentColor">
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {open ? (
        <div className="absolute z-30 mt-1 w-full rounded-sm border border-neutral-200 bg-white shadow-lg">
          <div className="border-b border-neutral-100 p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari kota / kabupaten..."
              className={inputBase}
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filteredCities.length === 0 ? (
              <li className="px-3.5 py-2.5 text-sm text-neutral-400">Tidak ditemukan</li>
            ) : (
              filteredCities.map((city) => (
                <li key={city.id}>
                  <button
                    type="button"
                    onClick={() => selectCity(city)}
                    className={`block w-full px-3.5 py-2 text-left text-sm hover:bg-brand-50 ${
                      city.id === value ? 'bg-brand-50 font-medium text-brand' : 'text-foreground'
                    }`}
                  >
                    {city.name}, {city.province}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
