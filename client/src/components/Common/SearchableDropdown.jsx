import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import './SearchableDropdown.css';

export default function SearchableDropdown({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select…',
  required = false,
  disabled = false,
  allowCustom = false,
  className = '',
  emptyMessage = 'No matches found',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef(null);

  const normalizedOptions = useMemo(
    () => options.filter(Boolean),
    [options]
  );

  const filtered = useMemo(() => {
    const term = (open ? query : value || '').trim().toLowerCase();
    if (!term) return normalizedOptions;
    return normalizedOptions.filter((opt) => opt.toLowerCase().includes(term));
  }, [normalizedOptions, open, query, value]);

  useEffect(() => {
    if (!open) setQuery(value || '');
  }, [value, open]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const closeDropdown = () => setOpen(false);

  const selectOption = (opt) => {
    onChange(opt);
    setQuery(opt);
    closeDropdown();
  };

  const handleFocus = () => {
    if (disabled) return;
    setOpen(true);
    setQuery(value || '');
  };

  const handleChange = (e) => {
    const next = e.target.value;
    setQuery(next);
    if (allowCustom) onChange(next);
    if (!open) setOpen(true);
  };

  const handleBlur = () => {
    window.setTimeout(() => {
      closeDropdown();
      if (!allowCustom) {
        if (value && !normalizedOptions.includes(value)) {
          onChange('');
          setQuery('');
        } else {
          setQuery(value || '');
        }
      } else {
        setQuery(value || '');
      }
    }, 150);
  };

  const displayValue = open ? query : (value || '');

  return (
    <div
      ref={wrapperRef}
      className={`searchable-dropdown ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${className}`.trim()}
    >
      <input
        type="text"
        className="searchable-dropdown-input"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        required={required}
        disabled={disabled}
        autoComplete="off"
        aria-expanded={open}
        aria-haspopup="listbox"
      />
      <FiChevronDown className="searchable-dropdown-chevron" aria-hidden />

      {open && !disabled && (
        <ul className="searchable-dropdown-menu" role="listbox">
          {filtered.length > 0 ? (
            filtered.map((opt) => (
              <li
                key={opt}
                role="option"
                aria-selected={opt === value}
                className={opt === value ? 'is-selected' : ''}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectOption(opt)}
              >
                {opt}
              </li>
            ))
          ) : allowCustom && query.trim() ? (
            <li
              className="searchable-dropdown-custom"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectOption(query.trim())}
            >
              Use &ldquo;{query.trim()}&rdquo;
            </li>
          ) : (
            <li className="searchable-dropdown-empty">{emptyMessage}</li>
          )}
        </ul>
      )}
    </div>
  );
}
