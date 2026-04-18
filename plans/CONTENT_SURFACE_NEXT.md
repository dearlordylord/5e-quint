# Content surface — next session resume point

**Read this first.** Everything needed to pick up where we left off.

## TL;DR

1. Overnight auto-close-loop + Layer 2 parking: **done and merged** (see `CONTENT_SURFACE_SURVEY.md` for the audit). Master has 361 batch commits + `TimeResetCadence` split refactor.
2. Dataset `survey-results-srd.jsonl` has systemically **stale proposals** from before the surface evolved. Re-mining reveals many "structural_widening" units are actually encodable today.
3. A bulk re-mine of 55 slugs (5 top widening families) was running when this note was written. **Check its state first.**
4. After bulk completes: integrate results, re-audit widenings, then pick ONE real-gap widening to design.

## Current master state

```
git log --oneline -3
  f89a74c0 refactor(surface): split RestResetCadence / TimeResetCadence by domain
  3bda25a2 merge: auto-close-loop overnight session
  ...
```

- `packages/prototype-content-surface/src/surface/types.ts` has the split types:
  - `RestResetCadence` (4 rest-only variants)
  - `TimeResetCadence` (5 calendar/elapsed variants; `never` lives here — user decision 2026-04-18)
  - `ResetCadence = RestResetCadence | TimeResetCadence` (union for consumers)
- `plans/CONTENT_SURFACE_LOOP_ACCEPTANCE.md`, `scripts/content-surface-survey/measure.sh`: shipped from overnight loop session.
- `CLAUDE.md` has a new short "Domain-language reflex" section — read it before designing any new type.

## First action on resume: check bulk re-mine status

```bash
# is the re-mine still running?
ps aux | grep -E "run-survey|worker.sh" | grep -v grep

# was the 55-slug list preserved at /tmp/remine_all.txt? if not, rebuild:
jq -r '. as $r
  | .claude_proposed_widenings[]?
  | (.name // .kind // "") as $n
  | select(
      $n == "MagicItemRecord" or
      $n == "grant_feat" or
      ($n | tostring | ascii_downcase | test("passive_grant|passive_class_feature|modify_ability_score"))
    )
  | $r.unit_slug' \
  scripts/content-surface-survey/survey-results-srd.jsonl \
  | sort -u > /tmp/remine_all.txt
```

- If still running: wait; note launch time was `2026-04-18 11:12 PDT`, expected ~1 slug/min × 55 slugs with 5-parallel ≈ 60-90 min wall-clock.
- If done but results uncommitted: `git status --short` will show many `results-srd/*/{result,verdict,proposal}.{json,md}` modifications plus `survey-results-srd.jsonl`. Commit them.

## Confirmed real gaps (verified by reading `types.ts`)

Verification ran on 2026-04-18. Crude grep in the earlier audit had false "real gap" labels; by reading the actual type definitions, 4 of 5 top candidates are **stale** (already in surface), leaving **1 confirmed real gap**:

| Widening | Status | Location in types.ts |
|---|---|---|
| `passive_grant family for ClassFeatureMechanics` | STALE — already implemented | `PassiveMechanics` at 2460 (grants: EffectAtom[]) |
| **`Attachment.object`** | **REAL GAP** | `Attachment` at 1431 has `self|target|area|mark`; no `object` kind |
| `DcSource.fixed` | STALE | `DcSource` at 1460 has `{ kind: "fixed"; dc: number }` |
| `EquipmentPredicate.holding_item` | STALE | line 2414 `{ kind: "holding_item" }` |
| `MagicItemRecord.attunementRestriction` | STALE | `MagicItemAttunementRestriction` at 2655 (spellcaster / class_list) |

**Implication:** most of the "pending design decisions" will evaporate after the bulk re-mine completes. Don't design against the dataset's current proposals; design only against post-re-mine data.

### Attachment.object — the one real gap (draft decision below)

**Exemplar units that proposed it** (from current `results-srd/*/result.json`):

| Slug | SRD evidence |
|---|---|
| `magic_item_sovereign_glue` | "form a permanent adhesive bond between **any two objects**" |
| `heat_metal` | "Choose a **manufactured metal object**, such as a metal weapon or a suit of Heavy or Medium metal armor, that you can see within range" |
| `daylight` | "cast the spell on **an object that isn't being worn or carried**" |
| `magic_item_instant_fortress` | "**grow** rapidly into a square adamantine tower" — **this is object CREATION, not Attachment** |
| `magic_item_talisman_of_the_sphere` | interacts with an existing sphere-of-annihilation object |
| `continual_flame` | cast on an object (flammable) |

Two distinct concepts surface in these:
1. **Attaching an effect to an existing world object** (heat_metal, daylight, sovereign_glue, continual_flame, talisman). This is the `Attachment.object` gap.
2. **Creating a new object in the world** (instant_fortress). This is a **separate** gap — an effect atom / mechanics family, NOT an Attachment kind. Leave for a later widening.

**Proposed shape for `Attachment.object`** (minimal, mirrors existing `target` / `area`):

```ts
// Attachment targeting existing world object(s) — non-creature, non-area.
// SRD examples: Heat Metal (metal weapon/armor), Daylight cast on an
// unworn object, Continual Flame (flammable object), Sovereign Glue
// (two-object bond). Does NOT cover object CREATION — that is a
// separate effect concept handled by a forthcoming `create_object`
// atom or mechanics family (Instant Fortress tower, Create Water).
| {
    readonly kind: "object";
    readonly count: 1 | 2;               // 2 = Sovereign Glue pair-bond
    readonly filter?: ObjectFilter;
    readonly rangeOrigin?: AttachmentRangeOrigin;
  }

// Filter predicates for existing-object selection. Fields are combined
// with AND. All optional; absence means the filter does not constrain
// on that dimension.
export type ObjectFilter = {
  readonly material?: ObjectMaterial;
  readonly heldOrWorn?: "required" | "forbidden";  // daylight: forbidden
  readonly manufactured?: boolean;                  // heat_metal: true
};

// Narrow enum; extend only when a new SRD unit surfaces a new material.
// Current SRD evidence: metal (heat_metal), flammable-material (continual_flame).
export type ObjectMaterial = "metal" | "flammable" | "any";
```

**Open question to confirm on resume:**

- `ObjectMaterial` — the set above is SRD-driven for today. Sovereign Glue and Talisman of the Sphere don't restrict material; they'd use `filter.material = "any"` (or just omit `material`). If we prefer "omit means any", drop the `"any"` value and make the field strictly narrowing. **Recommended: drop `"any"`.**
- `count: 1 | 2` — honest for today. If a future SRD unit needs N objects, broaden to `number`.
- Should we add `{ selection: "any_in_area" }` for area-of-effect "objects in a radius" semantics? Not in today's exemplars; defer.

**Consumer call sites to update:**

- `packages/prototype-content-surface/src/interpreter/tracer.ts` — add the `"object"` arm to the exhaustive `switch` on `Attachment.kind`. Minimum: render an "object target" node in Mermaid; no deeper tracer semantics needed for V1.
- `scripts/content-surface-survey/atom-whitelist.ts` — no new atom needed unless we promote `object_target` explicitly (current 129-atom vocabulary likely suffices).
- No content files need editing until we author `.dhall` for the six units above. Current `content/magic_item_cube_of_force.dhall` etc. don't use object attachment.

**Apply checklist (the next session runs this):**

1. Patch `types.ts` with the block above.
2. Add tracer arm.
3. `pnpm --filter @dnd/prototype-content-surface typecheck` must pass.
4. Smoke: `pnpm --filter @dnd/prototype-content-surface exec tsx src/run.ts content/magic_item_cube_of_force.json` still renders (unaffected).
5. Re-mine the 6 object-candidate slugs via `scripts/content-surface-survey/run-survey.sh --slugs-file /tmp/attachment_object_candidates.txt --force`. Expected: most move structural → surface/clean.
6. Commit `feat(surface): add Attachment.object for existing-object targeting`.

If anything above feels off (naming, field ordering, material enum values), edit the shape before running step 1. The rest of the pipeline is mechanical.

## Then: present ONE decision at a time

Per user's feedback 2026-04-18, each decision presented must first pass a staleness check (re-mined + verified against current types). Don't present decisions that dissolve on contact.

Decision-presentation format (agreed with user 2026-04-18):

1. Show the on-disk proposal for 1–2 exemplar units.
2. Show current type definition being widened.
3. Propose concrete diff (new variant / field).
4. User approves or edits.
5. Apply + `pnpm --filter @dnd/prototype-content-surface typecheck` + tracer-smoke one exemplar.
6. Re-mine affected slugs via `scripts/content-surface-survey/run-survey.sh --slugs-file PATH --force`.
7. Commit.

## Context: why staleness happens

- The dataset is append-only per-slug; each re-encode **replaces** the slug's row. But re-encoding only happens when the loop picks that slug's cluster.
- When the loop lands a surface change, it re-mines only the batched 2 slugs for that cluster — not all units.
- So a slug last mined in week N has its verdict frozen against the surface-of-week-N; it won't reflect surface evolution until re-mined.
- This is why `cube_of_force` had a `structural_widening` verdict citing "MagicItemRecord doesn't exist" when in fact it'd been added weeks ago. Re-mine flipped it to `clean`.

## Existing related plans (for cross-reference, not to edit)

- `CONTENT_SURFACE_SURVEY.md` — historical A vs B survey plan + overnight audit. A vs B decided: **B**. Keep for record; most of it is no longer actionable.
- `CONTENT_SURFACE_LOOP_ACCEPTANCE.md` — acceptance criteria for the overnight loop. The loop is done; kept as reference if we resume mining.
- `CONTENT_SURFACE_DEFERRED.md` — tracked deferred modeling questions. **Still live.** When a widening is designed and shipped, remove the matching entry from here.
- `CONTENT_SURFACE_DATA_FLOW_TEMP.md` — pipeline map. Update if the survey/authoring flow shifts.
- `CONTENT_SURFACE_PROTOTYPE.md` — original red/green prototype plan. Historical.

## What NOT to do

- **Don't** present widening decisions based on the current dataset without a fresh re-mine. Two attempts did this and both dissolved.
- **Don't** design a widening in a worktree sub-agent without capturing its output path — worktrees can be auto-cleaned. Either commit from the sub-agent or explicitly keep the path.
- **Don't** restart the auto-close-loop for more mining without a clear target cluster. The loop has diminishing returns; manual widening design is higher-leverage now.
- **Don't** touch `CONTENT_SURFACE_DEFERRED.md` blindly — it's the single source of truth for tracked modeling questions.
