import { useState, useEffect, useRef } from 'react';
import { fetchFunctionalAreas, saveFunctionalAreas } from '../utils/api';

function SummaryInput({ value, onChange, error, editingId, disabled }) {
  const [functionalArea, setFunctionalArea] = useState('');
  const [layer, setLayer] = useState('UI');
  const [title, setTitle] = useState('');
  const [areas, setAreas] = useState([]);
  const [areasLoaded, setAreasLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const initializedRef = useRef(false);
  const lastEditingIdRef = useRef(null);

  // Load functional areas from server
  useEffect(() => {
    async function loadAreas() {
      try {
        const result = await fetchFunctionalAreas();
        if (result.success) {
          setAreas(result.areas || []);
        }
      } catch (e) {
        console.error('Failed to load functional areas:', e);
      } finally {
        setAreasLoaded(true);
      }
    }
    loadAreas();
  }, []);

  // Parse existing value only when editing a different test case or on initial load
  useEffect(() => {
    // Reset when switching to a different test case or creating new
    if (editingId !== lastEditingIdRef.current) {
      lastEditingIdRef.current = editingId;
      initializedRef.current = false;
    }

    // Also reset if value is empty (form was reset)
    if (!value) {
      setFunctionalArea('');
      setLayer('UI');
      setTitle('');
      initializedRef.current = false;
      return;
    }

    if (initializedRef.current) return;

    const parts = value.split(' | ');
    if (parts.length === 3) {
      // Full format: "Area | Layer | Title"
      setFunctionalArea(parts[0]);
      setLayer(parts[1] === 'API' ? 'API' : 'UI');
      setTitle(parts[2]);
      initializedRef.current = true;
    } else if (parts.length === 1 && value.trim()) {
      // Single value - wait for areas to load before deciding
      if (!areasLoaded) return; // Don't parse yet, wait for areas to load

      // Check if it's a known functional area
      if (areas.includes(value.trim())) {
        setFunctionalArea(value.trim());
        setTitle('');
      } else {
        // Legacy format or unknown - treat as title only
        setTitle(value);
        setFunctionalArea('');
      }
      setLayer('UI');
      initializedRef.current = true;
    }
  }, [value, editingId, areas, areasLoaded]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        closeDropdown();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlight when dropdown opens or options change
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(-1);
    }
  }, [isOpen, inputValue]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-option]');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  function closeDropdown() {
    setIsOpen(false);
    setInputValue('');
    setHighlightedIndex(-1);
  }

  function openDropdown() {
    if (disabled) return;
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // Filter areas based on input
  const filteredAreas = areas.filter((area) =>
    area.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Check if we can create a new area
  const trimmedInput = inputValue.trim();
  const canCreate = trimmedInput && !areas.some(a => a.toLowerCase() === trimmedInput.toLowerCase());
  const totalOptions = filteredAreas.length + (canCreate ? 1 : 0);

  function buildSummary(area, lyr, ttl) {
    if (!area && !ttl) return '';
    if (!area) return ttl;
    if (!ttl) return `${area} | ${lyr}`;
    return `${area} | ${lyr} | ${ttl}`;
  }

  function handleAreaSelect(area) {
    setFunctionalArea(area);
    closeDropdown();
    onChange(buildSummary(area, layer, title));
  }

  async function handleCreateArea() {
    if (!canCreate) return;
    const newArea = trimmedInput;
    const updated = [...areas, newArea].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
    setAreas(updated);
    try {
      await saveFunctionalAreas(updated);
    } catch (e) {
      console.error('Failed to save functional areas:', e);
    }
    setFunctionalArea(newArea);
    closeDropdown();
    onChange(buildSummary(newArea, layer, title));
  }

  function handleKeyDown(e) {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        closeDropdown();
        break;

      case 'Tab':
        closeDropdown();
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex((prev) =>
            prev < totalOptions - 1 ? prev + 1 : prev
          );
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredAreas.length) {
          handleAreaSelect(filteredAreas[highlightedIndex]);
        } else if (canCreate) {
          handleCreateArea();
        } else if (filteredAreas.length > 0) {
          handleAreaSelect(filteredAreas[0]);
        }
        break;

      case 'Backspace':
        if (!inputValue && functionalArea) {
          setFunctionalArea('');
          onChange(buildSummary('', layer, title));
        }
        break;
    }
  }

  function handleLayerChange(lyr) {
    setLayer(lyr);
    onChange(buildSummary(functionalArea, lyr, title));
  }

  function handleTitleChange(e) {
    const newTitle = e.target.value;
    setTitle(newTitle);
    onChange(buildSummary(functionalArea, layer, newTitle));
  }

  async function handleRemoveArea(area, e) {
    e.stopPropagation();
    const updated = areas.filter((a) => a !== area);
    setAreas(updated);
    try {
      await saveFunctionalAreas(updated);
    } catch (e) {
      console.error('Failed to save functional areas:', e);
    }
    if (functionalArea === area) {
      setFunctionalArea('');
      onChange(buildSummary('', layer, title));
    }
  }

  function clearSelection(e) {
    e.stopPropagation();
    setFunctionalArea('');
    onChange(buildSummary('', layer, title));
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Summary <span className="text-red-500">*</span>
      </label>

      {/* Preview */}
      {(functionalArea || title) && (
        <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg font-mono">
          {buildSummary(functionalArea, layer, title) || 'Preview will appear here'}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        {/* Functional Area - 5 cols on desktop, full on mobile */}
        <div className="sm:col-span-5 relative" ref={containerRef}>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Functional Area
          </label>
          {/* Main input field */}
          <div
            className={`input min-h-[42px] h-auto flex items-center gap-2 p-2 ${
              disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-text'
            } ${isOpen ? 'ring-2 ring-primary-500 border-transparent' : ''} ${
              error && !functionalArea ? 'input-error' : ''
            }`}
            onClick={openDropdown}
          >
            {functionalArea && !isOpen ? (
              <>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 text-sm rounded-md bg-gray-100 dark:bg-gray-700">
                  <span className="text-gray-900 dark:text-white">{functionalArea}</span>
                  {!disabled && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={clearSelection}
                      className="ml-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </span>
                <span className="flex-1" />
              </>
            ) : isOpen ? (
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search or create..."
                className="flex-1 outline-none bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400"
                autoFocus
              />
            ) : (
              <span className="text-gray-400 text-sm flex-1">Search or create...</span>
            )}
            {/* Dropdown chevron */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className={`text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Dropdown */}
          {isOpen && (
            <div
              ref={listRef}
              className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto"
              role="listbox"
            >
              {/* Create new option */}
              {canCreate && (
                <div
                  data-option
                  onClick={handleCreateArea}
                  onMouseEnter={() => setHighlightedIndex(filteredAreas.length)}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-gray-100 dark:border-gray-700 text-primary-600 dark:text-primary-400 ${
                    highlightedIndex === filteredAreas.length
                      ? 'bg-primary-50 dark:bg-primary-900/30'
                      : 'hover:bg-primary-50 dark:hover:bg-primary-900/20'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span className="flex-1">
                    Create "<span className="font-medium">{trimmedInput}</span>"
                  </span>
                </div>
              )}

              {filteredAreas.length > 0 ? (
                <div className="py-1">
                  {filteredAreas.map((area, index) => (
                    <div
                      key={area}
                      data-option
                      onClick={() => handleAreaSelect(area)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`flex items-center justify-between px-3 py-2 cursor-pointer group ${
                        highlightedIndex === index
                          ? 'bg-primary-50 dark:bg-primary-900/30'
                          : functionalArea === area
                          ? 'bg-gray-50 dark:bg-gray-700/50'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      role="option"
                      aria-selected={highlightedIndex === index}
                    >
                      <span className="text-gray-900 dark:text-white">{area}</span>
                      <div className="flex items-center gap-2">
                        {functionalArea === area && (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-primary-600 flex-shrink-0">
                            <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={(e) => handleRemoveArea(area, e)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !canCreate ? (
                <div className="p-3 text-center text-gray-400 text-sm">
                  {inputValue ? 'No areas found' : 'No areas available'}
                </div>
              ) : null}

              {/* Hint to create when list is shown but nothing typed */}
              {!inputValue && filteredAreas.length > 0 && (
                <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700">
                  Type to create a new area
                </div>
              )}
            </div>
          )}
        </div>

        {/* Layer Toggle - 2 cols on desktop */}
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Layer
          </label>
          <div className={`flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[42px] ${disabled ? 'opacity-60' : ''}`}>
            <button
              type="button"
              onClick={() => !disabled && handleLayerChange('UI')}
              disabled={disabled}
              className={`flex-1 text-sm font-medium transition-colors ${disabled ? 'cursor-not-allowed' : ''} ${
                layer === 'UI'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              UI
            </button>
            <button
              type="button"
              onClick={() => !disabled && handleLayerChange('API')}
              disabled={disabled}
              className={`flex-1 text-sm font-medium transition-colors ${disabled ? 'cursor-not-allowed' : ''} ${
                layer === 'API'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              API
            </button>
          </div>
        </div>

        {/* Title - 5 cols on desktop, full on mobile */}
        <div className="sm:col-span-5">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Test case title"
            disabled={disabled}
            className={`input ${error && !title ? 'input-error' : ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
        </div>
      </div>

      {error && !functionalArea && !title && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
}

export default SummaryInput;
