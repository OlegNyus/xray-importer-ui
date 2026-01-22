import { useState, useEffect, useRef } from 'react';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#6b7280',
];

function CollectionInput({
  value,
  onChange,
  collections = [],
  onCreateCollection,
  placeholder = 'Type and press Enter to add collection',
  disabled,
}) {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [pendingName, setPendingName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Get selected collection object
  const selectedCollection = collections.find((c) => c.id === value);

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
    setShowColorPicker(false);
    setPendingName('');
    setHighlightedIndex(-1);
  }

  // Filter collections based on input
  const filteredCollections = collections.filter((col) =>
    col.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Check if input matches an existing collection name
  const exactMatch = collections.find(
    (col) => col.name.toLowerCase() === inputValue.trim().toLowerCase()
  );

  // Options include filtered collections + "add new" if applicable
  const showAddNew = inputValue.trim() && !exactMatch && onCreateCollection;
  const totalOptions = filteredCollections.length + (showAddNew ? 1 : 0);

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
        if (!showDropdown) {
          setShowDropdown(true);
        } else if (!showColorPicker) {
          setHighlightedIndex((prev) =>
            prev < totalOptions - 1 ? prev + 1 : prev
          );
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (showDropdown && !showColorPicker) {
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (showColorPicker) {
          createCollection();
        } else if (highlightedIndex >= 0 && highlightedIndex < filteredCollections.length) {
          selectCollection(filteredCollections[highlightedIndex]);
        } else if (highlightedIndex === filteredCollections.length && showAddNew) {
          handleSubmit();
        } else {
          handleSubmit();
        }
        break;

      case 'Backspace':
        if (!inputValue && selectedCollection) {
          onChange('');
        }
        break;

      case 'Home':
        if (showDropdown && totalOptions > 0) {
          e.preventDefault();
          setHighlightedIndex(0);
        }
        break;

      case 'End':
        if (showDropdown && totalOptions > 0) {
          e.preventDefault();
          setHighlightedIndex(totalOptions - 1);
        }
        break;
    }
  }

  function handleSubmit() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    if (exactMatch) {
      selectCollection(exactMatch);
      return;
    }

    setPendingName(trimmed);
    setSelectedColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setShowColorPicker(true);
    setShowDropdown(false);
  }

  async function createCollection() {
    if (!pendingName.trim() || !onCreateCollection) return;

    setIsCreating(true);
    try {
      const newCollection = await onCreateCollection(pendingName.trim(), selectedColor);
      if (newCollection?.id) {
        onChange(newCollection.id);
      }
      setInputValue('');
      setPendingName('');
      setShowColorPicker(false);
    } finally {
      setIsCreating(false);
    }
  }

  function selectCollection(col) {
    onChange(col.id);
    setInputValue('');
    setShowDropdown(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  }

  function clearSelection() {
    onChange('');
    setInputValue('');
    inputRef.current?.focus();
  }

  function cancelColorPicker() {
    setShowColorPicker(false);
    setPendingName('');
    setInputValue('');
  }

  return (
    <div className="relative" ref={containerRef}>
      <div
        className={`input min-h-[42px] h-auto flex items-center gap-2 p-2 ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-text'
        }`}
        onClick={() => {
          if (disabled) return;
          inputRef.current?.focus();
          setShowDropdown(true);
        }}
      >
        {selectedCollection && (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-1 text-sm rounded-md bg-gray-100 dark:bg-gray-700"
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: selectedCollection.color }}
            />
            <span className="text-gray-900 dark:text-white">{selectedCollection.name}</span>
            {!disabled && (
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelection();
                }}
                className="ml-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </span>
        )}
        {!disabled && !selectedCollection && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowDropdown(true);
              setShowColorPicker(false);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 min-w-[120px] outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
            role="combobox"
            aria-expanded={showDropdown}
            aria-haspopup="listbox"
          />
        )}
        {!disabled && selectedCollection && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowDropdown(true);
              setShowColorPicker(false);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder=""
            className="flex-1 min-w-[60px] outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
          />
        )}
      </div>

      {/* Dropdown for selecting existing collections */}
      {showDropdown && !showColorPicker && (filteredCollections.length > 0 || inputValue.trim()) && (
        <div
          ref={listRef}
          className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto"
          role="listbox"
        >
          {filteredCollections.length > 0 && (
            <div className="py-1">
              {filteredCollections.map((col, index) => (
                <div
                  key={col.id}
                  data-option
                  onClick={() => selectCollection(col)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${
                    highlightedIndex === index
                      ? 'bg-primary-50 dark:bg-primary-900/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  role="option"
                  aria-selected={highlightedIndex === index}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: col.color }}
                  />
                  <span className="text-gray-900 dark:text-white">{col.name}</span>
                </div>
              ))}
            </div>
          )}

          {showAddNew && (
            <button
              type="button"
              data-option
              onClick={handleSubmit}
              onMouseEnter={() => setHighlightedIndex(filteredCollections.length)}
              className={`w-full px-3 py-2 text-left text-primary-600 dark:text-primary-400 flex items-center gap-2 border-t border-gray-100 dark:border-gray-700 ${
                highlightedIndex === filteredCollections.length
                  ? 'bg-primary-50 dark:bg-primary-900/30'
                  : 'hover:bg-primary-50 dark:hover:bg-primary-900/20'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Add "{inputValue.trim()}"
            </button>
          )}
        </div>
      )}

      {/* Color picker for new collection */}
      {showColorPicker && (
        <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Pick a color for "{pendingName}"
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`w-6 h-6 rounded-full transition-all ${
                  selectedColor === color
                    ? 'ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-gray-800 scale-110'
                    : 'hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancelColorPicker}
              className="btn btn-ghost btn-sm flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={createCollection}
              disabled={isCreating}
              className="btn btn-primary btn-sm flex-1"
            >
              {isCreating ? <span className="spinner"></span> : 'Create'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CollectionInput;
