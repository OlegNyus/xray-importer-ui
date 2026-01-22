import { useState, useMemo } from 'react';
import { updateDraft } from '../utils/api';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#6b7280',
];

function CollectionsView({
  collections,
  testCases,
  onCreateCollection,
  onDeleteCollection,
  onEdit,
  onDelete,
  onRefresh,
  showToast,
}) {
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);

  // Get test cases for each collection (include both drafts and imported)
  const collectionCounts = useMemo(() => {
    const counts = { uncategorized: 0 };
    collections.forEach(col => { counts[col.id] = 0; });

    testCases.forEach(tc => {
      if (tc.collectionId && counts[tc.collectionId] !== undefined) {
        counts[tc.collectionId]++;
      } else {
        counts.uncategorized++;
      }
    });

    return counts;
  }, [collections, testCases]);

  // Get test cases for selected collection (include both drafts and imported)
  const selectedTestCases = useMemo(() => {
    if (selectedCollection === null) return [];

    return testCases.filter(tc => {
      if (selectedCollection === 'uncategorized') {
        return !tc.collectionId;
      }
      return tc.collectionId === selectedCollection;
    });
  }, [selectedCollection, testCases]);

  async function handleCreate(e) {
    e.preventDefault();
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    // Check for duplicate name
    const isDuplicate = collections.some(
      c => c.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      showToast('Collection with this name already exists');
      return;
    }

    setIsCreating(true);
    try {
      await onCreateCollection(trimmedName, newColor);
      setNewName('');
      setNewColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
      setShowAddForm(false);
    } catch (error) {
      showToast('Failed to create collection');
    } finally {
      setIsCreating(false);
    }
  }

  function handleCancelAdd() {
    setShowAddForm(false);
    setNewName('');
    setNewColor(PRESET_COLORS[0]);
  }

  async function handleDeleteCollection(id) {
    // Check if collection has test cases
    const count = collectionCounts[id] || 0;
    if (count > 0) {
      showToast(`Move ${count} test case${count > 1 ? 's' : ''} first to delete this collection`);
      return;
    }
    await onDeleteCollection(id);
    if (selectedCollection === id) {
      setSelectedCollection(null);
    }
  }

  // Drag and drop handlers
  function handleDragStart(e, tc) {
    setDraggedItem(tc);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  async function handleDrop(e, targetCollectionId) {
    e.preventDefault();
    if (!draggedItem) return;

    const newCollectionId = targetCollectionId === 'uncategorized' ? null : targetCollectionId;

    if (draggedItem.collectionId !== newCollectionId) {
      try {
        await updateDraft(draggedItem.id, { ...draggedItem, collectionId: newCollectionId });
        onRefresh();
        showToast('Test case moved');
      } catch (error) {
        showToast('Failed to move test case');
      }
    }

    setDraggedItem(null);
  }

  function handleDragEnd() {
    setDraggedItem(null);
  }

  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  function getCollection(id) {
    return collections.find(c => c.id === id);
  }

  return (
    <div className="flex gap-4 min-h-[400px]">
      {/* Sidebar - Collections list */}
      <div className="w-64 flex-shrink-0">
        {/* Header with Add button */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900 dark:text-white">Your Collections</h3>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
            >
              + Add
            </button>
          )}
        </div>

        {/* Add Collection Form */}
        {showAddForm && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <form onSubmit={handleCreate}>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Collection Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Sprint 1, Smoke Tests..."
                className="input w-full text-sm mb-3"
                maxLength={30}
                autoFocus
              />

              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Color
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColor(color)}
                    className={`w-6 h-6 rounded-full transition-all ${
                      newColor === color
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
                  onClick={handleCancelAdd}
                  className="btn btn-ghost btn-sm flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim() || isCreating}
                  className="btn btn-primary btn-sm flex-1"
                >
                  {isCreating ? (
                    <span className="spinner"></span>
                  ) : (
                    'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Collection list */}
        <div className="space-y-1">
          {/* Uncategorized */}
          <button
            onClick={() => setSelectedCollection('uncategorized')}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'uncategorized')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
              selectedCollection === 'uncategorized'
                ? 'bg-gray-200 dark:bg-gray-700'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            } ${draggedItem ? 'border-2 border-dashed border-transparent hover:border-primary-400' : ''}`}
          >
            <span className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0"></span>
            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">Uncategorized</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums w-4 text-right">{collectionCounts.uncategorized}</span>
            <span className="w-4 flex-shrink-0"></span>{/* Spacer to align with delete button */}
          </button>

          {/* Collections */}
          {collections.map((col) => (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                selectedCollection === col.id
                  ? 'bg-gray-200 dark:bg-gray-700'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              } ${draggedItem ? 'border-2 border-dashed border-transparent hover:border-primary-400' : ''}`}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0 cursor-pointer"
                style={{ backgroundColor: col.color }}
                onClick={() => setSelectedCollection(col.id)}
              ></span>
              <span
                className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate cursor-pointer"
                onClick={() => setSelectedCollection(col.id)}
              >
                {col.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums w-4 text-right">{collectionCounts[col.id] || 0}</span>
              <button
                onClick={() => handleDeleteCollection(col.id)}
                className="w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all hover:scale-110 flex-shrink-0"
                title="Delete collection"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 4h10M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M11 4v7a1 1 0 01-1 1H4a1 1 0 01-1-1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          ))}

          {/* Empty state for collections */}
          {collections.length === 0 && !showAddForm && (
            <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-sm">
              <p>No collections yet</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="text-primary-500 hover:text-primary-600 mt-1"
              >
                Create your first collection
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main area - Test cases in selected collection */}
      <div className="flex-1 border-l border-gray-200 dark:border-gray-700 pl-4">
        {selectedCollection === null ? (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <div className="text-center">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-3 opacity-50">
                <path d="M8 16h16l6 6h10v18a2 2 0 01-2 2H10a2 2 0 01-2-2V16z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
              <p>Select a collection to view test cases</p>
              <p className="text-sm mt-1">Drag test cases to move between collections</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              {selectedCollection === 'uncategorized' ? (
                <>
                  <span className="w-4 h-4 rounded-full bg-gray-400"></span>
                  <h3 className="font-medium text-gray-900 dark:text-white">Uncategorized</h3>
                </>
              ) : (
                <>
                  <span
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: getCollection(selectedCollection)?.color }}
                  ></span>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {getCollection(selectedCollection)?.name}
                  </h3>
                </>
              )}
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({selectedTestCases.length} test case{selectedTestCases.length !== 1 ? 's' : ''})
              </span>
            </div>

            {selectedTestCases.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <p>No test cases in this collection</p>
                <p className="text-sm mt-1">Drag test cases here to add them</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedTestCases.map((tc) => (
                  <div
                    key={tc.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, tc)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-move hover:border-primary-300 dark:hover:border-primary-700 transition-colors ${
                      draggedItem?.id === tc.id ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Drag handle */}
                    <div className="text-gray-400">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M5 3h2v2H5V3zm4 0h2v2H9V3zM5 7h2v2H5V7zm4 0h2v2H9V7zm-4 4h2v2H5v-2zm4 0h2v2H9v-2z" fill="currentColor"/>
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white truncate">
                          {tc.summary || 'Untitled'}
                        </span>
                        {tc.isComplete ? (
                          <span className="badge badge-success flex items-center gap-1">
                            Draft
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                        ) : (
                          <span className="badge badge-draft">Draft</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {tc.steps?.length || 0} steps • {formatDate(tc.updatedAt)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => onEdit(tc.id)}
                        className="btn-icon"
                        title="Edit"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M10 2l2 2-7 7H3v-2l7-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => onDelete(tc.id)}
                        className="btn-icon hover:text-red-500"
                        title="Delete"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CollectionsView;
