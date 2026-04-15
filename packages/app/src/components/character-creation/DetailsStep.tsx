import type { CharacterDraft } from "@dnd/core/character-domain.ts"

import {
  CLERIC_EXAMPLE_DRAFT,
  FIGHTER_EXAMPLE_DRAFT,
  FIGHTER_LEVEL5_EXAMPLE_DRAFT
} from "#/components/character-creation/characterCreationPresets.ts"
import { JsonEditor } from "#/components/character-creation/characterCreationShared.tsx"
import { renderOpenChoicePickers } from "#/components/character-creation/OpenChoicePicker.tsx"

const DETAILS_PRESETS = [
  { label: "Fighter Lv1", draft: FIGHTER_EXAMPLE_DRAFT },
  { label: "Fighter Lv5", draft: FIGHTER_LEVEL5_EXAMPLE_DRAFT },
  { label: "Cleric Lv1", draft: CLERIC_EXAMPLE_DRAFT }
] as const

function detailsSliceFrom(draft: CharacterDraft): Partial<CharacterDraft> {
  return {
    choices: draft.choices,
    equipment: draft.equipment,
    spellcasting: draft.spellcasting
  }
}

export function DetailsStep({
  draft,
  updateDraft
}: {
  draft: CharacterDraft
  updateDraft: (patch: Partial<CharacterDraft>) => void
}) {
  const pickers = renderOpenChoicePickers({ draft, onPatch: updateDraft })
  return (
    <div className="mt-5 space-y-5">
      <p className="text-sm text-gray-400">
        Step 5 owns the remaining structured choices. Pickers below are driven by core-owned open-choice payloads;
        uncovered slices stay in the JSON editors.
      </p>
      {pickers.length === 0 ? null : (
        <div className="space-y-3">
          {pickers.map((picker) => (
            <div key={picker.key}>{picker.element}</div>
          ))}
        </div>
      )}
      <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-3">
        <p className="text-xs uppercase tracking-wide text-gray-400">Load example details</p>
        <p className="mt-1 text-xs text-gray-500">
          Fills choices / equipment / spellcasting only. Class, background, species, ability scores, etc. stay as-is.
          Core sanitization may drop fields incompatible with your current class — check the sidebar for dropped facts.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DETAILS_PRESETS.map((preset) => (
            <button
              key={preset.label}
              className="rounded-md border border-gray-700 px-3 py-1 text-xs text-gray-200 transition hover:border-amber-400 hover:text-amber-300"
              onClick={() => updateDraft(detailsSliceFrom(preset.draft))}
              type="button"
            >
              Load {preset.label} details
            </button>
          ))}
        </div>
      </div>
      <JsonEditor
        label="Build choices JSON"
        onChange={(value) => updateDraft({ choices: value as CharacterDraft["choices"] })}
        value={draft.choices}
      />
      <JsonEditor
        label="Equipment JSON"
        onChange={(value) => updateDraft({ equipment: value as CharacterDraft["equipment"] })}
        value={draft.equipment}
      />
      <JsonEditor
        label="Spellcasting JSON"
        onChange={(value) => updateDraft({ spellcasting: value as CharacterDraft["spellcasting"] })}
        value={draft.spellcasting}
      />
    </div>
  )
}
