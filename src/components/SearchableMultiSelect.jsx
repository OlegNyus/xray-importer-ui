import { useState, useEffect, useRef } from 'react';

function SearchableMultiSelect({
  label,
  values = [],
  onChange,
  options = [],
  loading,
  error,
  required,
  placeholder = 'Type to search...',
  savedDisplays = [],
  emptyMessage = 'No items available',
}) {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

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

  // Close dropdown on Escape key (document-level for when dropdown is open)
  useEffect(() => {
    if (!showDropdown) return;

    function handleEscapeKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDropdown();
        setInputValue('');
      }
    }
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [showDropdown]);

  // Reset highlight when dropdown opens or options change
  useEffect(() => {
    if (showDropdown) {
      setHighlightedIndex(-1);
    }
  }, [showDropdown, inputValue]);

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
    setShowDropdown(false);
    setHighlightedIndex(-1);
  }

  // Check if a value is selected
  const isSelected = (opt) => {
    if (values.includes(opt.issueId)) return true;
    if (opt.key && values.includes(opt.key)) return true;
    return false;
  };

  // Merge saved displays with loaded options for showing selected items
  const allItems = options.length > 0 ? options : (savedDisplays || []).map(d => ({
    issueId: d.id,
    key: d.display.split(':')[0],
    summary: d.display.split(': ').slice(1).join(': '),
  }));

  // Filter options based on input (only unselected ones)
  const filteredOptions = allItems.filter((opt) => {
    if (isSelected(opt)) return false;
    const searchTerm = inputValue.toLowerCase();
    const optText = `${opt.key}: ${opt.summary}`.toLowerCase();
    return optText.includes(searchTerm);
  });

  // Limit visible options for performance
  const visibleOptions = filteredOptions.slice(0, 50);

  // Get selected items for display
  const selectedItems = allItems.filter((opt) => isSelected(opt));

  const toggleOption = (opt) => {
    const displayText = `${opt.key}: ${opt.summary}`;
    const currentlySelected = isSelected(opt);

    if (currentlySelected) {
      onChange(
        values.filter((v) => v !== opt.issueId && v !== opt.key),
        (savedDisplays || []).filter((d) => d.id !== opt.issueId && d.id !== opt.key)
      );
    } else {
      onChange(
        [...values, opt.issueId],
        [...(savedDisplays || []), { id: opt.issueId, display: displayText }]
      );
      setInputValue('');
      setHighlightedIndex(-1);
    }
  };

  function handleKeyDown(e) {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        closeDropdown();
        break;

      case 'Tab':
        // Close dropdown on Tab (standard behavior - move to next field)
        closeDropdown();
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (!showDropdown) {
          setShowDropdown(true);
        } else {
          setHighlightedIndex((prev) =>
            prev < visibleOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (showDropdown) {
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < visibleOptions.length) {
          toggleOption(visibleOptions[highlightedIndex]);
        } else if (visibleOptions.length > 0) {
          // Select first option if nothing highlighted
          toggleOption(visibleOptions[0]);
        }
        break;

      case 'Backspace':
        if (!inputValue && selectedItems.length > 0) {
          // Remove last selected item
          const lastItem = selectedItems[selectedItems.length - 1];
          toggleOption(lastItem);
        }
        break;

      case 'Home':
        if (showDropdown && visibleOptions.length > 0) {
          e.preventDefault();
          setHighlightedIndex(0);
        }
        break;

      case 'End':
        if (showDropdown && visibleOptions.length > 0) {
          e.preventDefault();
          setHighlightedIndex(visibleOptions.length - 1);
        }
        break;
    }
  }

  const selectedCount = values.length;

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
        {selectedCount > 0 && (
          <span className="ml-2 text-xs text-primary-600 dark:text-primary-400">
            ({selectedCount} selected)
          </span>
        )}
      </label>

      <div
        className={`input min-h-[42px] h-auto flex flex-wrap gap-1.5 p-2 cursor-text ${
          error ? 'border-red-500 focus-within:ring-red-500' : ''
        }`}
        onClick={() => {
          inputRef.current?.focus();
          setShowDropdown(true);
        }}
      >
        {/* Selected items as chips */}
        {selectedItems.map((item) => (
          <span
            key={item.issueId}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
          >
            <span className="truncate max-w-[150px]" title={`${item.key}: ${item.summary}`}>
              {item.key}
            </span>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                toggleOption(item);
              }}
              className="text-primary-500 hover:text-primary-700 dark:hover:text-primary-200"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </span>
        ))}

        {/* Search input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedItems.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[100px] outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400 text-sm"
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-activedescendant={highlightedIndex >= 0 ? `option-${highlightedIndex}` : undefined}
        />
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={listRef}
          className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-auto"
          role="listbox"
        >
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm p-3">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></span>
              Loading...
            </div>
          ) : visibleOptions.length === 0 ? (
            <p className="text-gray-400 text-sm p-3">
              {inputValue ? 'No matches found' : (allItems.length === 0 ? emptyMessage : 'All items selected')}
            </p>
          ) : (
            <div className="py-1">
              {visibleOptions.map((opt, index) => (
                <div
                  key={opt.issueId}
                  id={`option-${index}`}
                  data-option
                  onClick={() => toggleOption(opt)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${
                    highlightedIndex === index
                      ? 'bg-primary-50 dark:bg-primary-900/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  role="option"
                  aria-selected={highlightedIndex === index}
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    <span className="font-medium text-gray-900 dark:text-white">{opt.key}</span>
                    <span className="text-gray-500 dark:text-gray-400">: {opt.summary}</span>
                  </span>
                </div>
              ))}
              {filteredOptions.length > 50 && (
                <p className="text-gray-400 text-xs p-2 border-t border-gray-100 dark:border-gray-700">
                  Type to filter {filteredOptions.length - 50} more items...
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default SearchableMultiSelect;
