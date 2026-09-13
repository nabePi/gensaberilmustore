'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { inputBase } from '@/lib/styles';

type Option = { label: string; id?: string; zipCode?: string };

function SearchDropdown({
  value,
  options,
  onOpen,
  onSearch,
  onSelect,
  placeholder,
  disabled = false,
  hasError = false,
}: {
  value: string;
  options: Option[];
  onOpen: () => void;
  onSearch: (query: string) => void;
  onSelect: (option: Option) => void;
  placeholder: string;
  disabled?: boolean;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (disabled) return;
    setOpen(true);
    setQuery('');
    onOpen();
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function selectOption(option: Option) {
    onSelect(option);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openDropdown())}
        disabled={disabled}
        className={`${inputBase} flex items-center justify-between text-left disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400 ${
          hasError ? 'border-red' : ''
        }`}
      >
        <span className={value ? 'text-foreground' : 'text-neutral-400'}>
          {value || placeholder}
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
              onChange={(event) => {
                setQuery(event.target.value);
                onSearch(event.target.value);
              }}
              placeholder="Cari..."
              className={inputBase}
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {options.length === 0 ? (
              <li className="px-3.5 py-2.5 text-sm text-neutral-400">Tidak ditemukan</li>
            ) : (
              options.map((option) => (
                <li key={option.id ?? option.label}>
                  <button
                    type="button"
                    onClick={() => selectOption(option)}
                    className={`block w-full px-3.5 py-2 text-left text-sm hover:bg-brand-50 ${
                      option.label === value
                        ? 'bg-brand-50 font-medium text-brand'
                        : 'text-foreground'
                    }`}
                  >
                    {option.label}
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

export type DestinationValue = {
  destinationId: string;
  provinceName: string;
  cityName: string;
  districtName: string;
  subdistrictName: string;
  zipCode: string;
};

export function DestinationSelect({
  initialDestinationId,
  onChange,
  hasError = false,
}: {
  initialDestinationId?: string | null;
  onChange: (value: DestinationValue | null) => void;
  hasError?: boolean;
}) {
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [subdistrict, setSubdistrict] = useState('');
  const [zipCode, setZipCode] = useState('');

  const [provinceOptions, setProvinceOptions] = useState<Option[]>([]);
  const [cityOptions, setCityOptions] = useState<Option[]>([]);
  const [districtOptions, setDistrictOptions] = useState<Option[]>([]);
  const [subdistrictOptions, setSubdistrictOptions] = useState<Option[]>([]);

  const loadedInitialRef = useRef(false);

  useEffect(() => {
    if (loadedInitialRef.current || !initialDestinationId) return;
    loadedInitialRef.current = true;

    async function loadInitial() {
      const response = await fetch(`/api/shipping/destinations/${initialDestinationId}`);
      if (!response.ok) return;
      const data: {
        id: string;
        provinceName: string;
        cityName: string;
        districtName: string;
        subdistrictName: string;
        zipCode: string;
      } = await response.json();

      setProvince(data.provinceName);
      setCity(data.cityName);
      setDistrict(data.districtName);
      setSubdistrict(data.subdistrictName);
      setZipCode(data.zipCode);
      onChange({
        destinationId: data.id,
        provinceName: data.provinceName,
        cityName: data.cityName,
        districtName: data.districtName,
        subdistrictName: data.subdistrictName,
        zipCode: data.zipCode,
      });
    }

    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDestinationId]);

  const fetchLevel = useMemo(
    () =>
      async (
        level: 'province' | 'city' | 'district' | 'subdistrict',
        q: string,
        parents: { province?: string; city?: string; district?: string },
      ) => {
        const params = new URLSearchParams({ level, ...parents });
        if (q) params.set('q', q);
        const response = await fetch(`/api/shipping/destinations?${params.toString()}`);
        if (!response.ok) return [] as Option[];
        const data: {
          items: string[] | { id: string; subdistrictName: string; zipCode: string }[];
        } = await response.json();

        if (level === 'subdistrict') {
          return (data.items as { id: string; subdistrictName: string; zipCode: string }[]).map(
            (item) => ({ label: item.subdistrictName, id: item.id, zipCode: item.zipCode }),
          );
        }
        return (data.items as string[]).map((label) => ({ label }));
      },
    [],
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-600">
          Provinsi <span className="text-red">*</span>
        </label>
        <SearchDropdown
          value={province}
          options={provinceOptions}
          hasError={hasError && !province}
          placeholder="Pilih Provinsi"
          onOpen={async () => setProvinceOptions(await fetchLevel('province', '', {}))}
          onSearch={async (q) => setProvinceOptions(await fetchLevel('province', q, {}))}
          onSelect={(option) => {
            setProvince(option.label);
            setCity('');
            setDistrict('');
            setSubdistrict('');
            setZipCode('');
            setCityOptions([]);
            setDistrictOptions([]);
            setSubdistrictOptions([]);
            onChange(null);
          }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-600">
          Kota / Kabupaten <span className="text-red">*</span>
        </label>
        <SearchDropdown
          value={city}
          options={cityOptions}
          disabled={!province}
          hasError={hasError && !city}
          placeholder="Pilih Kota / Kabupaten"
          onOpen={async () => setCityOptions(await fetchLevel('city', '', { province }))}
          onSearch={async (q) => setCityOptions(await fetchLevel('city', q, { province }))}
          onSelect={(option) => {
            setCity(option.label);
            setDistrict('');
            setSubdistrict('');
            setZipCode('');
            setDistrictOptions([]);
            setSubdistrictOptions([]);
            onChange(null);
          }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-600">
          Kecamatan <span className="text-red">*</span>
        </label>
        <SearchDropdown
          value={district}
          options={districtOptions}
          disabled={!city}
          hasError={hasError && !district}
          placeholder="Pilih Kecamatan"
          onOpen={async () =>
            setDistrictOptions(await fetchLevel('district', '', { province, city }))
          }
          onSearch={async (q) =>
            setDistrictOptions(await fetchLevel('district', q, { province, city }))
          }
          onSelect={(option) => {
            setDistrict(option.label);
            setSubdistrict('');
            setZipCode('');
            setSubdistrictOptions([]);
            onChange(null);
          }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-600">
          Kelurahan <span className="text-red">*</span>
        </label>
        <SearchDropdown
          value={subdistrict}
          options={subdistrictOptions}
          disabled={!district}
          hasError={hasError && !subdistrict}
          placeholder="Pilih Kelurahan"
          onOpen={async () =>
            setSubdistrictOptions(await fetchLevel('subdistrict', '', { province, city, district }))
          }
          onSearch={async (q) =>
            setSubdistrictOptions(await fetchLevel('subdistrict', q, { province, city, district }))
          }
          onSelect={(option) => {
            setSubdistrict(option.label);
            setZipCode(option.zipCode ?? '');
            if (option.id) {
              onChange({
                destinationId: option.id,
                provinceName: province,
                cityName: city,
                districtName: district,
                subdistrictName: option.label,
                zipCode: option.zipCode ?? '',
              });
            }
          }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-neutral-600">Kode Pos</label>
        <input value={zipCode} readOnly className={`${inputBase} bg-neutral-50 text-neutral-500`} />
      </div>
    </div>
  );
}
