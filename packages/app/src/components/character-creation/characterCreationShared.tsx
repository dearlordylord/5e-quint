import { useEffect, useState } from "react"

export const PRETTY_PRINT_SPACE_COUNT = 2

export function displayValue(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, current) => {
      if (current instanceof Set) return [...current]
      if (current instanceof Map) return Object.fromEntries(current)
      return current
    },
    PRETTY_PRINT_SPACE_COUNT
  )
}

function stringifyForEditor(value: unknown): string {
  return value == null ? "" : JSON.stringify(value, null, PRETTY_PRINT_SPACE_COUNT)
}

export function titleCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function JsonEditor({
  label,
  onChange,
  value
}: {
  label: string
  onChange: (value: unknown) => void
  value: unknown
}) {
  const [text, setText] = useState(stringifyForEditor(value))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setText(stringifyForEditor(value))
    setError(null)
  }, [value])

  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-gray-200">{label}</span>
      <textarea
        className="min-h-48 w-full rounded-lg border border-gray-800 bg-gray-950 p-3 font-mono text-sm text-gray-100"
        onChange={(event) => {
          const nextText = event.target.value
          setText(nextText)
          if (nextText.trim() === "") {
            setError(null)
            onChange(undefined)
            return
          }
          try {
            const parsed = JSON.parse(nextText) as unknown
            setError(null)
            onChange(parsed)
          } catch (jsonError) {
            setError(jsonError instanceof Error ? jsonError.message : "Invalid JSON")
          }
        }}
        spellCheck={false}
        value={text}
      />
      {error == null ? null : <p className="text-sm text-rose-400">{error}</p>}
    </label>
  )
}
