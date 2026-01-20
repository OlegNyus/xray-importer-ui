import { useState } from 'react';
import Modal from './Modal';

const PRESET_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#6b7280', // gray
];

function CollectionManager({ collections, onCreateCollection, onDeleteCollection, onClose }) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsCreating(true);
    try {
      await onCreateCollection(newName.trim(), newColor);
      setNewName('');
      setNewColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(id) {
    await onDeleteCollection(id);
    setDeleteConfirm(null);
  }

  return (
    <Modal onClose={onClose}>
      <div className="max-w-md">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Manage Collections
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          Organize your test cases into collections for easier management.
        </p>

        {/* Create new collection */}
        <form onSubmit={handleCreate} className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            New Collection
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Collection name..."
              className="input flex-1"
              maxLength={30}
            />
            {/* Color picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center"
                style={{ backgroundColor: newColor }}
                title="Pick color"
              />
              {showColorPicker && (
                <div className="absolute right-0 top-full mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                  <div className="grid grid-cols-5 gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          setNewColor(color);
                          setShowColorPicker(false);
                        }}
                        className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${newColor === color ? 'ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-gray-800' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={!newName.trim() || isCreating}
              className="btn btn-primary"
            >
              {isCreating ? (
                <span className="spinner"></span>
              ) : (
                'Add'
              )}
            </button>
          </div>
        </form>

        {/* Collection list */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {collections.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 py-4">
              No collections yet. Create one above.
            </p>
          ) : (
            collections.map((col) => (
              <div
                key={col.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: col.color }}
                  />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {col.name}
                  </span>
                </div>
                {deleteConfirm === col.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(col.id)}
                      className="text-sm text-red-500 hover:text-red-600 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(col.id)}
                    className="btn-icon hover:text-red-500"
                    title="Delete collection"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="btn btn-secondary w-full">
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default CollectionManager;
