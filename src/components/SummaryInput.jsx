import { useState, useEffect, useRef } from 'react';
import { fetchFunctionalAreas, saveFunctionalAreas } from '../utils/api';

function SummaryInput({ value, onChange, error, editingId, disabled }) {
  const [functionalArea, setFunctionalArea] = useState('');
  const [layer, setLayer] = useState('UI');
  const [title, setTitle] = useState('');
  const [areas, setAreas] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [newArea, setNewArea] = useState('');
  const [showAddNew, setShowAddNew] = useState(false);
  const dropdownRef = useRef(null);
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
      setFunctionalArea(parts[0]);
      setLayer(parts[1] === 'API' ? 'API' : 'UI');
      setTitle(parts[2]);
      initializedRef.current = true;
    } else if (parts.length === 1 && value.trim()) {
      // Single value - check if it's a known functional area
      if (areas.includes(value.trim())) {
        setFunctionalArea(value.trim());
        setTitle('');
      } else {
        // Legacy format - treat as title only
        setTitle(value);
        setFunctionalArea('');
      }
      setLayer('UI');
      initializedRef.current = true;
    }
  }, [value, editingId, areas]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
        setShowAddNew(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function buildSummary(area, lyr, ttl) {
    if (!area && !ttl) return '';
    if (!area) return ttl;
    if (!ttl) return area;
    return `${area} | ${lyr} | ${ttl}`;
  }

  function handleAreaChange(area) {
    setFunctionalArea(area);
    setShowDropdown(false);
    onChange(buildSummary(area, layer, title));
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

  async function handleAddNewArea() {
    if (!newArea.trim()) return;
    const trimmed = newArea.trim();
    if (!areas.includes(trimmed)) {
      const updated = [...areas, trimmed].sort();
      setAreas(updated);
      try {
        await saveFunctionalAreas(updated);
      } catch (e) {
        console.error('Failed to save functional areas:', e);
      }
    }
    setFunctionalArea(trimmed);
    setNewArea('');
    setShowAddNew(false);
    setShowDropdown(false);
    onChange(buildSummary(trimmed, layer, title));
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
        <div className="sm:col-span-5 relative" ref={dropdownRef}>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Functional Area
          </label>
          <button
            type="button"
            onClick={() => !disabled && setShowDropdown(!showDropdown)}
            disabled={disabled}
            className={`input w-full text-left flex items-center justify-between ${error && !functionalArea ? 'input-error' : ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <span className={functionalArea ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
              {functionalArea || 'Select...'}
            </span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {showDropdown && (
            <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
              {areas.length > 0 && (
                <div className="py-1">
                  {areas.map((area) => (
                    <div
                      key={area}
                      onClick={() => handleAreaChange(area)}
                      className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer group"
                    >
                      <span className="text-gray-900 dark:text-white">{area}</span>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveArea(area, e)}
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

              {!showAddNew ? (
                <button
                  type="button"
                  onClick={() => setShowAddNew(true)}
                  className="w-full px-3 py-2 text-left text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center gap-2 border-t border-gray-100 dark:border-gray-700"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Add new area
                </button>
              ) : (
                <div className="p-2 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newArea}
                      onChange={(e) => setNewArea(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNewArea()}
                      placeholder="New area name"
                      className="input flex-1 text-sm"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddNewArea}
                      disabled={!newArea.trim()}
                      className="btn btn-primary btn-sm"
                    >
                      Add
                    </button>
                  </div>
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
