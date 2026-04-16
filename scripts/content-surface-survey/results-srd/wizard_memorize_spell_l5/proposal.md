# Proposal: surface_widening — Memorize Spell (wizard L5)

## Unit

- **Slug:** `wizard_memorize_spell_l5`
- **Kind:** `class_feature` / wizard / acquired at L5
- **SRD section:** Classes/Wizard#Level 5: Memorize Spell

## Rule text

> Whenever you finish a Short Rest, you can study your spellbook and replace one of the level 1+ Wizard spells you have prepared for your Spellcasting feature with another level 1+ spell from the book.

## Why this does not fit

### Gap 1 — Missing `ClassFeatureEffect` variant (primary blocker)

The core effect of Memorize Spell is **mutating the prepared-spell list**: remove one currently-prepared level-1+ Wizard spell and add a different level-1+ spell from the spellbook in its place.

`ClassFeatureEffect` in `types.ts` is:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

Neither variant covers prepared-list mutation. The v4 taxonomy (`TAXONOMY_atoms_graph.md`) lists `grant_spell_access` as an Effect atom, but this atom does not appear in `ClassFeatureEffect` — and even if it did, the semantic is "grant access to a spell" (additive), not "swap one prepared spell for another" (replacement). A replacement operation is modeled in v4 as the `replace` Procedure atom, but there is no `ClassFeatureEffect` variant that combines removal of one prepared entry and addition of another.

**Proposed widening:**

Add a new variant to `ClassFeatureEffect`:

```typescript
export type SwapPreparedSpellEffect = {
  readonly kind: "swap_prepared_spell";
  readonly minSpellLevel: number;   // 1 for Memorize Spell ("level 1+")
  readonly source: "spellbook";     // where the replacement spell must come from
};
```

This maps to the v4 `grant_spell_access` effect atom (for the inbound spell) combined with an implicit revocation of the outbound slot — or, if the taxonomy distinguishes them, to a new `replace_prepared_spell` atom that pairs removal + grant in one unit.

### Gap 2 — Mandatory `UseCountResource` in `ClassFeatureMechanicsHeader` (secondary gap)

`ClassFeatureMechanicsHeader` requires:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};
```

Memorize Spell has no stated use count. The SRD says "Whenever you finish a Short Rest, you **can**…" — the short rest *is* the trigger, not a reset cadence for an otherwise-depleted pool. There is no limit on how many prepared spells you could theoretically swap across multiple short rests on the same adventuring day; each short rest simply gives you the opportunity once.

Modeling this as `{ kind: "fixed", uses: 1 }` + `{ kind: "short_rest" }` is a *pragmatically close* approximation (one opportunity per short rest in practice), but it introduces a count constraint the SRD does not impose. If a future feature genuinely has a stated "once per short rest" cap, the two would be indistinguishable in the encoding, violating the principle that the surface should make invalid states unrepresentable.

**Proposed widening:**

Either:
- Make `resource` optional in `ClassFeatureMechanicsHeader` for trigger-based features; or
- Add a new `ClassFeatureMechanics` variant: `rest_triggered` (parallel to `activation`), where the rest completion is the enabling window rather than a resource refill:

```typescript
export type ClassFeatureRestTriggeredMechanics = {
  readonly family: "rest_triggered";
  readonly restKind: RestKind;      // "short" | "long"
  readonly effect: ClassFeatureEffect;
};
```

## Classification

- **Outcome:** `surface_widening`
- Both gaps are missing variants of existing surface types — the family `activation` (and `ClassFeatureMechanics`) exists; `ClassFeatureEffect` needs a prepared-spell-mutation variant, and `ClassFeatureMechanicsHeader` needs a resource-free trigger path.
- No new v4 taxonomy atom is required beyond `grant_spell_access` (already in v4) if we define the effect as additive+implicit-revocation. If the taxonomy wants to distinguish "replace" as a separate atom from "grant_spell_access", that is an `atom_widening`; but under the conservative read it is a `surface_widening` only.

## Files NOT written

- `content/wizard_memorize_spell_l5.dhall` — not authored (unit does not fit)
- `content/wizard_memorize_spell_l5.json` — not authored
- `content/wizard_memorize_spell_l5.trace.md` — not authored
