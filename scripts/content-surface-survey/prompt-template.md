# Encode one D&D 5e unit into the content surface

You are encoding ONE unit — spell, class feature, feat, species trait, mastery, or magic item — into the authored surface of a content prototype. The goal is to see whether the unit's mechanics fit the current closed atom vocabulary, and if not, to record what's missing.

## Reference material (INLINED — do NOT re-read these files)

All reference files are provided below. Do NOT use the Read tool on any of these files — they are already here and reading them again wastes time.

### src/surface/types.ts — ground truth for allowed JSON shapes

```typescript
{{TYPES_TS}}
```

### src/interpreter/tracer.ts — ADT walker (exhaustive switch on all kinds)

```typescript
{{TRACER_TS}}
```

### Reference encoding: bless.dhall (ongoing_effect spell, concentration)

```dhall
{{BLESS_DHALL}}
```

### Reference encoding: bless.json (compiled from bless.dhall)

```json
{{BLESS_JSON}}
```

### Reference encoding: action_surge.dhall (class feature with use-count + rest reset)

```dhall
{{ACTION_SURGE_DHALL}}
```

### Reference encoding: action_surge.json (compiled from action_surge.dhall)

```json
{{ACTION_SURGE_JSON}}
```

### TAXONOMY_atoms_graph.md — v4 atom inventory (for widening classification)

```markdown
{{TAXONOMY_MD}}
```

## Task steps

1. Read the unit source text (below) and identify the payload family:
   - `ongoing_effect` (spell) — persistent state while concentration/timed.
   - `activation` (spell) — instant/one-shot; may have multiple phases.
   - `triggered_reaction` (spell) — reaction-shaped spell.
   - `anchored_trigger` (spell) — planted/armed effect released by later events.
   - `activation` (class feature) — activated class feature; see action_surge above.
   - `on_hit_trigger` (mastery) — weapon-hit rider.
2. Decide whether an existing top-level `UnitRecord` kind and mechanics family can encode the unit HONESTLY.
3. If the answer is **no**, STOP BEFORE AUTHORING A PLACEHOLDER JSON.
   - Do not force the unit into the "closest" valid record shape.
   - Do not create knowingly false traces such as "grant_extra_action" for a passive rider.
   - Write only `result-{{UNIT_SLUG}}.json` and `proposal-{{UNIT_SLUG}}.md`.
   - Classify as `structural_widening` if the family/kind is missing, or `surface_widening` / `atom_widening` if the family exists but a specific shape/atom is missing.
4. If the answer is **yes**, author `content/{{UNIT_SLUG}}.dhall` as the single source of truth.
5. Run `pnpm typecheck` from `packages/prototype-content-surface/`. Fix JSON errors until typecheck passes. Do NOT modify types.ts.
6. Run `pnpm exec tsx src/run.ts content/{{UNIT_SLUG}}.json --out content/{{UNIT_SLUG}}.trace.md`. Observe output.
7. If the tracer throws `unhandled <...>`, STOP — record the missing shape in `proposal.md` and classify the outcome from the failure:
   - missing top-level kind / family = `structural_widening`
   - missing variant of existing surface type = `surface_widening`
   - missing v4 atom / relation = `atom_widening`
8. Write `result-{{UNIT_SLUG}}.json` with the schema below.

## result-{{UNIT_SLUG}}.json schema

```json
{
  "unit_slug": "{{UNIT_SLUG}}",
  "outcome": "clean" | "surface_widening" | "atom_widening" | "structural_widening" | "dm_agenda" | "refused",
  "atoms_used": [string],       // atoms in the tracer output (read from trace md)
  "relations_used": [string],   // relations in the tracer output
  "proposed_widenings": [
    {
      "kind": "new_atom" | "new_variant" | "new_relation" | "new_subgraph",
      "name": "string",
      "justification": "why this rule forces it",
      "evidence": "quote from unit text"
    }
  ],
  "confidence": "low" | "medium" | "high",
  "notes": "free-form, brief"
}
```

## Outcome classification

- **`clean`** — JSON typechecks, tracer emits a mermaid graph, no proposals.
- **`surface_widening`** — A new variant of an existing surface type is needed (e.g., a new `CastingTime` kind, a new `Attachment` origin). All atoms used exist in v4.
- **`atom_widening`** — A new atom (not in v4) is needed. Or the tracer threw `unhandled`.
- **`structural_widening`** — The unit's shape doesn't fit any existing payload family. A new family or cross-family composition is forced.
- **`dm_agenda`** — The unit's CORE mechanic is DM adjudication (Wish's Reshape Reality, Geas's compliance, Alarm's notification, etc. per `ARCHITECTURE.md`). Legitimately out-of-core. Use this for units whose entire purpose is narrative, informational, or DM-decided outcomes with no deterministic mechanical resolution.
- **`refused`** — You cannot encode this within the protocol. Must explain why in `notes`.

## Guardrails

- Be conservative. If you're not sure whether an atom exists, check types.ts above. If it's not there, it's a widening.
- Be honest about family fit. If the unit does not fit an existing `UnitRecord` kind or mechanics family, do not coerce it into a fake-but-valid JSON.
- A misleading trace is worse than no trace. If the only way to get a trace is to lie about the rule, do not produce `content/{{UNIT_SLUG}}.dhall` or `content/{{UNIT_SLUG}}.json`.
- Do NOT invent atoms into a JSON hoping the tracer accepts them. The tracer has exhaustive `switch` statements that throw on unknown kinds.
- Do NOT claim `clean` if typecheck or tracer failed.
- Do NOT hand-edit `content/{{UNIT_SLUG}}.json`.
- Do NOT modify any file outside `content/{{UNIT_SLUG}}.dhall`, `result-{{UNIT_SLUG}}.json`, `proposal-{{UNIT_SLUG}}.md`.
- If tracer output surprises you (wrong atoms listed), that's a DISCREPANCY to note — don't paper over with a cleaner JSON.
- Do not default upward to `atom_widening`. Use the narrowest honest classification:
  - `surface_widening` if a variant of an existing surface shape would solve it
  - `atom_widening` only if the missing concept is not in v4 taxonomy
  - `structural_widening` if no honest family/kind exists
- When the unit mostly fits but has a secondary omitted rider, mention the omission explicitly in `notes`/`proposal.md` rather than pretending the whole unit is clean.

## When done

Your final output must be valid for the path you chose:

If the unit fits honestly:

- `content/{{UNIT_SLUG}}.dhall` — authored source.
- `content/{{UNIT_SLUG}}.json` — generated from Dhall by the worker; typechecks against `UnitRecord`.
- `content/{{UNIT_SLUG}}.trace.md` — the tracer's mermaid graph.
- `result-{{UNIT_SLUG}}.json` — your self-classification.
- `proposal-{{UNIT_SLUG}}.md` — if outcome != `clean`, describe the gap. Required for non-clean outcomes, optional for clean.

If the unit does NOT fit honestly:

- Do NOT write `content/{{UNIT_SLUG}}.dhall`.
- Do NOT write `content/{{UNIT_SLUG}}.json`.
- Do NOT write `content/{{UNIT_SLUG}}.trace.md`.
- Write `result-{{UNIT_SLUG}}.json`.
- Write `proposal-{{UNIT_SLUG}}.md`.

The harness will independently validate your outputs. Your self-verdict is an input to classification, not the final word.

## CRITICAL: You MUST write result files

The harness reads `result-{{UNIT_SLUG}}.json` to extract your verdict. If you do not write this file, the harness records `invalid` and the unit must be reprocessed. **Every outcome — including widening, dm_agenda, and refused — requires writing `result-{{UNIT_SLUG}}.json`.** Do not just describe your analysis in text output; you must use the Write tool to create the file.

---

## Unit to encode

- Name: `{{UNIT_NAME}}`
- Slug: `{{UNIT_SLUG}}`
- Kind: `{{UNIT_KIND}}`
- Provenance: `{{UNIT_PROVENANCE}}` (srd-5.2.1 = SRD-shippable; xphb = PHB-only research)

### Your working directory

You're operating inside a copy of `packages/prototype-content-surface/`. The files you MAY write (use EXACTLY these slug-prefixed names so concurrent worker runs don't collide):

- `content/{{UNIT_SLUG}}.dhall` — the authored source of the unit.
- `content/{{UNIT_SLUG}}.json` — the runtime artifact consumed by typecheck + tracer. The worker derives this from your `.dhall`; do not hand-maintain both.
- `result-{{UNIT_SLUG}}.json` — your structured self-report (schema above).
- `proposal-{{UNIT_SLUG}}.md` — prose describing widenings IF the unit doesn't fit.

Do NOT write `result.json` or `proposal.md` (unsuffixed) — those names are shared across workers and will be lost.

Do NOT modify `src/surface/types.ts`, `src/interpreter/tracer.ts`, or anything under `.references/`. The surface is read-only for this task.

### Source text

```
{{UNIT_TEXT}}
```
