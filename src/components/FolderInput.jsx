import { useState, useEffect, useRef, useMemo } from 'react';

function FolderInput({
  value,
  onChange,
  folders,
  loading,
  error,
  required,
  placeholder = 'Type to search folders...',
}) {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Flatten folder tree into a list of paths
  const folderPaths = useMemo(() => {
    const flattenFolders = (folder, list = []) => {
      if (!folder) return list;
      if (folder.path && folder.path !== '/') {
        list.push(folder.path);
      }
      if (folder.folders && Array.isArray(folder.folders)) {
        folder.folders.forEach((sub) => flattenFolders(sub, list));
      }
      return list;
    };
    return ['/', ...flattenFolders(folders)];
  }, [folders]);

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
    setIsEditing(false);
    setInputValue('');
    setHighlightedIndex(-1);
  }

  // Filter folders based on input
  const filteredFolders = folderPaths.filter((path) =>
    path.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Check if we should show custom path option
  const showCustomPath = inputValue.startsWith('/') && !filteredFolders.includes(inputValue);
  const totalOptions = filteredFolders.length + (showCustomPath ? 1 : 0);

  // Get display name for a folder path
  const getDisplayName = (path) => {
    if (path === '/') return '/ (Root)';
    return path;
  };

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
        } else {
          setHighlightedIndex((prev) =>
            prev < totalOptions - 1 ? prev + 1 : prev
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
        if (highlightedIndex >= 0 && highlightedIndex < filteredFolders.length) {
          selectFolder(filteredFolders[highlightedIndex]);
        } else if (highlightedIndex === filteredFolders.length && showCustomPath) {
          selectFolder(inputValue);
        } else if (filteredFolders.length > 0) {
          selectFolder(filteredFolders[0]);
        } else if (inputValue.startsWith('/')) {
          selectFolder(inputValue);
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

  function selectFolder(path) {
    onChange(path);
    closeDropdown();
  }

  function startEditing() {
    setIsEditing(true);
    setShowDropdown(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Folder {required && <span className="text-red-500">*</span>}
      </label>

      {/* Display mode - shows selected folder */}
      {!isEditing ? (
        <div
          onClick={startEditing}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              startEditing();
            }
          }}
          tabIndex={0}
          role="button"
          className={`input min-h-[42px] flex items-center gap-2 p-2 cursor-pointer hover:border-primary-400 ${
            error ? 'border-red-500' : ''
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400 flex-shrink-0">
            <path d="M2 4.5h5l1 1h6v7a1 1 0 01-1 1H3a1 1 0 01-1-1v-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          <span className="flex-1 text-gray-900 dark:text-white truncate">
            {getDisplayName(value || '/')}
          </span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400 flex-shrink-0">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      ) : (
        /* Edit mode - shows search input */
        <div
          className={`input min-h-[42px] flex items-center gap-2 p-2 ${
            error ? 'border-red-500 focus-within:ring-red-500' : ''
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400 flex-shrink-0">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowDropdown(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400 text-sm"
            role="combobox"
            aria-expanded={showDropdown}
            aria-haspopup="listbox"
          />
        </div>
      )}

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
              Loading folders...
            </div>
          ) : filteredFolders.length === 0 && !showCustomPath ? (
            <div className="p-3">
              <p className="text-gray-400 text-sm">No folders match "{inputValue}"</p>
            </div>
          ) : (
            <div className="py-1">
              {filteredFolders.map((path, index) => (
                <div
                  key={path}
                  data-option
                  onClick={() => selectFolder(path)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${
                    highlightedIndex === index
                      ? 'bg-primary-50 dark:bg-primary-900/30'
                      : value === path
                      ? 'bg-gray-50 dark:bg-gray-700/50'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  role="option"
                  aria-selected={highlightedIndex === index}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-gray-400 flex-shrink-0">
                    <path d="M2 4h4l1 1h5v6a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                    {getDisplayName(path)}
                  </span>
                  {value === path && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-primary-600 flex-shrink-0">
                      <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              ))}

              {showCustomPath && (
                <button
                  type="button"
                  data-option
                  onClick={() => selectFolder(inputValue)}
                  onMouseEnter={() => setHighlightedIndex(filteredFolders.length)}
                  className={`w-full px-3 py-2 text-left text-primary-600 dark:text-primary-400 flex items-center gap-2 border-t border-gray-100 dark:border-gray-700 ${
                    highlightedIndex === filteredFolders.length
                      ? 'bg-primary-50 dark:bg-primary-900/30'
                      : 'hover:bg-primary-50 dark:hover:bg-primary-900/20'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Use "{inputValue}" as custom path
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default FolderInput;
