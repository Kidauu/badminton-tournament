export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  count: number;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="segmented" role="group">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? "segmented-btn segmented-btn-active" : "segmented-btn"}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          <span className="segmented-count">{option.count}</span>
        </button>
      ))}
    </div>
  );
}
