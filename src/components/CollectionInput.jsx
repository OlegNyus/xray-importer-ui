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
  placeholder = 'Search or create...',
  disabled,
}) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isCreating, setIsCreating] = useState(false);
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

  // Filter collections based on input
  const filteredCollections = collections.filter((col) =>
    col.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Check if we can create a new collection
  const trimmedInput = inputValue.trim();
  const exactMatch = collections.some(
    (col) => col.name.toLowerCase() === trimmedInput.toLowerCase()
  );
  const canCreate = onCreateCollection && trimmedInput && !exactMatch;

  // Create new collection
  async function handleCreate() {
    if (!canCreate || isCreating) return;
    setIsCreating(true);
    try {
      const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
      const newCollection = await onCreateCollection(trimmedInput, randomColor);
      if (newCollection?.id) {
        onChange(newCollection.id);
      }
      closeDropdown();
    } catch (error) {
      console.error('Failed to create collection:', error);
    } finally {
      setIsCreating(false);
    }
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
            prev < filteredCollections.length - 1 ? prev + 1 : prev
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
        if (highlightedIndex >= 0 && highlightedIndex < filteredCollections.length) {
          selectCollection(filteredCollections[highlightedIndex]);
        } else if (canCreate) {
          handleCreate();
        } else if (filteredCollections.length > 0) {
          selectCollection(filteredCollections[0]);
        }
        break;

      case 'Backspace':
        if (!inputValue && selectedCollection) {
          onChange('');
        }
        break;

      case 'Home':
        if (isOpen && filteredCollections.length > 0) {
          e.preventDefault();
          setHighlightedIndex(0);
        }
        break;

      case 'End':
        if (isOpen && filteredCollections.length > 0) {
          e.preventDefault();
          setHighlightedIndex(filteredCollections.length - 1);
        }
        break;
    }
  }

  function selectCollection(col) {
    onChange(col.id);
    closeDropdown();
  }

  function clearSelection(e) {
    e.stopPropagation();
    onChange('');
    setInputValue('');
  }

  function openDropdown() {
    if (disabled) return;
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Main input field */}
      <div
        className={`input min-h-[42px] h-auto flex items-center gap-2 p-2 ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-text'
        } ${isOpen ? 'ring-2 ring-primary-500 border-transparent' : ''}`}
        onClick={openDropdown}
      >
        {selectedCollection && !isOpen ? (
          <>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 text-sm rounded-md bg-gray-100 dark:bg-gray-700">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedCollection.color }}
              />
              <span className="text-gray-900 dark:text-white">{selectedCollection.name}</span>
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
            placeholder={onCreateCollection ? "Search or create..." : "Search collections..."}
            className="flex-1 outline-none bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400"
            autoFocus
          />
        ) : (
          <span className="text-gray-400 text-sm">{placeholder}</span>
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
              onClick={handleCreate}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-gray-100 dark:border-gray-700 hover:bg-primary-50 dark:hover:bg-primary-900/30 text-primary-600 dark:text-primary-400"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span className="flex-1">
                Create "<span className="font-medium">{trimmedInput}</span>"
              </span>
              {isCreating && (
                <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600"></span>
              )}
            </div>
          )}

          {filteredCollections.length > 0 ? (
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
                      : value === col.id
                      ? 'bg-gray-50 dark:bg-gray-700/50'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  role="option"
                  aria-selected={highlightedIndex === index}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: col.color }}
                  />
                  <span className="text-gray-900 dark:text-white flex-1">{col.name}</span>
                  {value === col.id && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-primary-600 flex-shrink-0">
                      <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              ))}
            </div>
          ) : !canCreate ? (
            <div className="p-3 text-center text-gray-400 text-sm">
              {inputValue ? 'No collections found' : 'No collections available'}
            </div>
          ) : null}

          {/* Hint to create when list is shown but nothing typed */}
          {onCreateCollection && !inputValue && filteredCollections.length > 0 && (
            <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700">
              Type to create a new collection
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CollectionInput;
