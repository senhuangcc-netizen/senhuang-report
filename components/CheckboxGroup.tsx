'use client'

interface Props {
  label: string
  options: string[]
  values: string[]
  onChange: (values: string[]) => void
  allowCustom?: boolean
}

export default function CheckboxGroup({ label, options, values, onChange, allowCustom }: Props) {
  const toggle = (opt: string) => {
    onChange(values.includes(opt) ? values.filter(v => v !== opt) : [...values, opt])
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-48 overflow-y-auto border border-gray-100 rounded-lg p-2 bg-gray-50">
        {options.map(opt => (
          <label key={opt} className="flex items-start gap-2 cursor-pointer hover:bg-white rounded p-1">
            <input
              type="checkbox"
              checked={values.includes(opt)}
              onChange={() => toggle(opt)}
              className="mt-0.5 accent-amber-600"
            />
            <span className="text-sm text-gray-700 leading-tight">{opt}</span>
          </label>
        ))}
        {allowCustom && (
          <label className="flex items-start gap-2 col-span-full mt-1">
            <span className="text-sm text-gray-500 mt-1">其他：</span>
            <input
              type="text"
              placeholder="自填..."
              className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-amber-500"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const v = (e.target as HTMLInputElement).value.trim()
                  if (v && !values.includes(v)) onChange([...values, v]);
                  (e.target as HTMLInputElement).value = ''
                }
              }}
            />
          </label>
        )}
      </div>
      {values.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {values.map(v => (
            <span key={v} className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full">
              {v}
              <button type="button" onClick={() => toggle(v)} className="hover:text-red-600">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
