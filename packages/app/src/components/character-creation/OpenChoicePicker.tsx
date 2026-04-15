import type { CharacterDraft, CharacterOpenChoicePayload } from "@dnd/core/character-domain.ts"
import { buildOpenChoicePatch, listCharacterFeaturePickers } from "@dnd/core/character-domain.ts"
import type { ReactElement } from "react"

import { titleCase } from "#/components/character-creation/characterCreationShared.tsx"

function featureTitle(payload: CharacterOpenChoicePayload): string {
  return payload.featureRef
    .split(":")
    .map((segment) => titleCase(segment.replace(/_/g, " ")))
    .join(" · ")
}

export function OpenChoicePicker({
  draft,
  onPatch,
  payload
}: {
  draft: CharacterDraft
  onPatch: (patch: Partial<CharacterDraft>) => void
  payload: CharacterOpenChoicePayload
}) {
  const title = featureTitle(payload)
  const isMultiPick = payload.pickCount > 1
  const selected = new Set(payload.current)

  if (isMultiPick) {
    const atLimit = selected.size >= payload.pickCount
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-3">
        <p className="text-xs uppercase tracking-wide text-gray-400">
          {title} ({selected.size} of {payload.pickCount})
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {payload.options.map((option) => {
            const checked = selected.has(option)
            const disabled = !checked && atLimit
            return (
              <label
                key={option}
                className={`flex items-center gap-2 rounded-md border px-2 py-1 text-xs ${
                  checked
                    ? "border-amber-500 bg-amber-500/10 text-amber-200"
                    : disabled
                      ? "cursor-not-allowed border-gray-800 bg-gray-950/40 text-gray-500"
                      : "border-gray-700 bg-gray-950/60 text-gray-200 hover:border-gray-500"
                }`}
              >
                <input
                  checked={checked}
                  disabled={disabled}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...payload.current, option]
                      : payload.current.filter((entry) => entry !== option)
                    onPatch(buildOpenChoicePatch(draft, payload, next))
                  }}
                  type="checkbox"
                />
                <span>{titleCase(option)}</span>
              </label>
            )
          })}
        </div>
      </div>
    )
  }

  const currentValue = payload.current[0] ?? ""
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-3">
      <p className="text-xs uppercase tracking-wide text-gray-400">{title}</p>
      <select
        className="mt-2 w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-gray-100"
        onChange={(event) => {
          const value = event.target.value
          onPatch(buildOpenChoicePatch(draft, payload, value === "" ? undefined : value))
        }}
        value={currentValue}
      >
        <option value="">— not selected —</option>
        {payload.options.map((option) => (
          <option key={option} value={option}>
            {titleCase(option)}
          </option>
        ))}
      </select>
    </div>
  )
}

export function renderOpenChoicePickers({
  draft,
  onPatch
}: {
  draft: CharacterDraft
  onPatch: (patch: Partial<CharacterDraft>) => void
}) {
  const rendered: Array<{ key: string; element: ReactElement }> = []
  for (const payload of listCharacterFeaturePickers(draft)) {
    rendered.push({
      key: payload.featureRef,
      element: <OpenChoicePicker draft={draft} onPatch={onPatch} payload={payload} />
    })
  }
  return rendered
}
