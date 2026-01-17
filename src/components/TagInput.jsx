import { useState, useEffect, useRef } from 'react';
import { fetchLabels, saveLabels } from '../utils/api';

function TagInput({ tags, onChange, placeholder, disabled }) {
  const [inputValue, setInputValue] = useState('');
  const [availableLabels, setAvailableLabels] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Load labels from server
  useEffect(() => {
    async function loadLabels() {
      try {
        const result = await fetchLabels();
        if (result.success) {
          setAvailableLabels(result.labels || []);
        }
      } catch (e) {
        console.error('Failed to load labels:', e);
      }
    }
    loadLabels();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
        setShowAddNew(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter labels based on input
  const filteredLabels = availableLabels.filter(
    (label) =>
      !tags.includes(label) &&
      label.toLowerCase().includes(inputValue.toLowerCase())
  );

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    }

    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }

    if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  }

  function addTag(value) {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      // Add to available labels if not exists
      if (!availableLabels.includes(trimmed)) {
        const updated = [...availableLabels, trimmed].sort((a, b) =>
          a.toLowerCase().localeCompare(b.toLowerCase())
        );
        setAvailableLabels(updated);
        saveLabels(updated).catch((e) => console.error('Failed to save labels:', e));
      }
    }
    setInputValue('');
    setShowDropdown(false);
  }

  function selectLabel(label) {
    if (!tags.includes(label)) {
      onChange([...tags, label]);
    }
    setInputValue('');
    setShowDropdown(false);
    inputRef.current?.focus();
  }

  function removeTag(index) {
    onChange(tags.filter((_, i) => i !== index));
  }

  async function removeFromAvailable(label, e) {
    e.stopPropagation();
    const updated = availableLabels.filter((l) => l !== label);
    setAvailableLabels(updated);
    try {
      await saveLabels(updated);
    } catch (e) {
      console.error('Failed to save labels:', e);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <div
        className={`input min-h-[42px] h-auto flex flex-wrap gap-2 p-2 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-text'}`}
        onClick={() => {
          if (disabled) return;
          inputRef.current?.focus();
          setShowDropdown(true);
        }}
      >
        {tags.map((tag, index) => (
          <span key={index} className="tag">
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
                className="ml-1 text-primary-500 hover:text-primary-700"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </span>
        ))}
        {!disabled && (
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
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
          />
        )}
      </div>

      {showDropdown && (filteredLabels.length > 0 || inputValue.trim()) && (
        <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredLabels.length > 0 && (
            <div className="py-1">
              {filteredLabels.map((label) => (
                <div
                  key={label}
                  onClick={() => selectLabel(label)}
                  className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer group"
                >
                  <span className="text-gray-900 dark:text-white">{label}</span>
                  <button
                    type="button"
                    onClick={(e) => removeFromAvailable(label, e)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {inputValue.trim() && !availableLabels.includes(inputValue.trim()) && (
            <button
              type="button"
              onClick={() => addTag(inputValue)}
              className="w-full px-3 py-2 text-left text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center gap-2 border-t border-gray-100 dark:border-gray-700"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Add "{inputValue.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default TagInput;
