const PASTEL_COLORS = [
  '#a5c7e9', // Soft blue
  '#a8e6cf', // Mint
  '#c9b8e8', // Lavender
  '#ffd3b6', // Peach
  '#ffb6c1', // Soft pink
  '#f5b5b5', // Light coral
  '#f9e9a1', // Soft yellow
  '#a8e0e0', // Light teal
];

function ColorPicker({ value, onChange, label }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className="flex gap-2 flex-wrap">
        {PASTEL_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`w-8 h-8 rounded-full transition-all ${
              value === color
                ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800 scale-110'
                : 'hover:scale-105'
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  );
}

export { PASTEL_COLORS };
export default ColorPicker;
