export default function SegmentedNav({ value, onChange, options }) {
  return (
    <div className="segmented" role="tablist" aria-label="Section">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={active ? 'segmented__btn segmented__btn--active' : 'segmented__btn'}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
