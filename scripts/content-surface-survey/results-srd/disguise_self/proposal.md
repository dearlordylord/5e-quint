# Proposal: Disguise Self — atom_widening

## What fits

Disguise Self maps cleanly to the `ongoing_effect` family. Every header field is expressible today:

| Field | Value |
|---|---|
| `family` | `"ongoing_effect"` |
| `level` | `1` |
| `school` | `"illusion"` |
| `castingTime` | `{ kind: "action" }` |
| `range` | `{ kind: "self" }` |
| `components` | `{ v: true, s: true, m: false }` |
| `duration` | `{ kind: "timed", value: { unit: "hour", amount: 1 } }` |
| `attachment` | `{ kind: "self" }` |

## What doesn't fit

### Blocker 1 — missing `OngoingOperation` variant and v4 atom

`OngoingOperation = RollModifierOperation | DamageOnHitOperation`

The spell's effect is visual appearance modification: the caster (and gear) looks different for 1 hour. Neither existing operation variant covers this.

In the v4 atom taxonomy there is no effect atom for creature appearance modification. `alter_item_kind` is scoped to items only. A new atom — tentatively `alter_appearance` — is needed.

**Proposed surface shape (sketch):**

```typescript
export type AlterAppearanceOperation = {
  readonly kind: "alter_appearance";
  readonly constraints: {
    readonly sameLimbArrangement: true;
    readonly maxHeightDeltaFeet: number;       // 1 for Disguise Self
  };
  readonly failsPhysicalInspection: boolean;  // true for Disguise Self
  readonly piercingCheck?: PiercingCheck;
};

// Where PiercingCheck encodes the "Study + INT Investigation vs spell save DC" pattern:
export type PiercingCheck = {
  readonly requiredAction: "study";
  readonly ability: Ability;                  // "int"
  readonly skill: string;                     // "investigation"
  readonly dc: DcSource;                      // { kind: "caster_spell_save_dc" }
};
```

### Blocker 2 — detection mechanic needs a surface shape

The `ability_check` resolution atom exists in v4. But the surface has no grammar for a *passive*, *creature-initiated* piercing check that runs against an ongoing illusion effect. The current resolution atoms (`attack_roll`, `save_gate`, `ability_check`) are all attacker-initiated at cast time, not observer-initiated post-cast.

The `piercingCheck` rider on `AlterAppearanceOperation` above is the minimal surface addition needed to capture this. Alternatively, a dedicated `PiercingCheck` could be a top-level member of `OngoingOperation` if other spells (Major Image, Silent Image, etc.) share the pattern — but Disguise Self is the current pressure case.

## v4 atom inventory impact

| Atom | Action |
|---|---|
| `alter_appearance` | **new** effect atom — visual appearance modification of a creature, does not change underlying physical properties, fails physical inspection |

All other atoms in the graph for this unit (`activate`, `persist`, `expire`, `action_quota`, `spell_slot`, `self`) already exist in v4.

## Tracer graph shape (if widening lands)

```
spell_root → activate → action_quota (consumes)
                      → spell_slot ≥ 1 (consumes)
                      → persist → expire (1 hour)
                      → self (attaches_to)
                      → alter_appearance (grants) → self (attaches_to)
                                                  → ability_check (piercing check, observer-initiated)
```

## Confidence

**High.** The family fit is unambiguous; the single gap is the missing operation/atom for appearance modification.
