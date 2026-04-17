# Proposal: Ring of Invisibility — Surface Widenings

## Unit

**Ring of Invisibility** — Magic Item, Legendary, Requires Attunement  
SRD 5.2.1 section: `MagicItems#Ring of Invisibility`

## Summary

The ring fits the `magic_item` / `activation` family structurally. The effect atom (`apply_condition "invisible"` on self, via a `direct` phase) encodes cleanly. Two surface-level variants block honest encoding.

---

## Gap 1 — Unlimited activation resource

### Problem

`ActivatedAbilityMechanics` requires `resource: ActivationResource`, which in turn requires a `cap: UseCountCap`. Current variants:

```typescript
export type UseCountCap =
  | { readonly kind: "fixed"; readonly uses: number }
  | ThresholdTiers<number>
  | LinearPerLevel<number>
  | { readonly kind: "proficiency_bonus" }
  | { readonly kind: "ability_modifier"; readonly ability: Ability };
```

The Ring of Invisibility imposes no per-activation limit. The SRD text gives no charges, no daily limit, no rest reset — the wearer may activate and deactivate freely. Encoding with `fixed: 1` (or any integer) would misrepresent the rule and produce a misleading trace.

### Proposed widening

Add to `UseCountCap`:

```typescript
| { readonly kind: "unlimited" }
```

**Tracer behavior:** When cap is `unlimited`, emit a `use_count` resource node labeled `"unlimited"` with no `persists_until` edge (no reset cadence needed or appropriate).

**Survey evidence:** Ring of Invisibility is the first clear instance, but any "at-will activated" magic item (e.g., a hypothetical Ring of Feather Falling activated on demand) would share this gap.

---

## Gap 2 — Wearer-initiated dismissal via Bonus Action

### Problem

The invisibility ends when "you take a Bonus Action to become visible again." This is a deliberate wearer-initiated dismissal — distinct from all current end-condition vocabulary:

- `DurationEndTrigger` (on `timed`/`concentration`) covers externally-caused events: attack roll made, damage taken, spell cast, armor donned, etc.
- `permanent` duration's `endsOn` accepts only `"dispel" | "damage"`.

The v4 lifecycle atom `self_break` (TAXONOMY_atoms_graph.md §6) models this concept — a deliberate actor-initiated break of a persistent effect — but it is not surfaced by any `Duration` field.

### Proposed widening

**Option A (narrowest):** Add `"wearer_bonus_action"` to the `permanent` duration's `endsOn` enum:

```typescript
readonly endsOn?: ReadonlyNonEmptyArray<"dispel" | "damage" | "wearer_bonus_action">;
```

**Option B (more general):** Add a new `DurationEndTrigger` variant:

```typescript
| { readonly kind: "wearer_spends_bonus_action" }
```

This would also apply to `timed` and `concentration` durations if a future spell ends early on the caster's voluntary Bonus Action.

**Tracer behavior:** Emit a `self_break` lifecycle node connected to the `persist` node via a `persists_until` edge, labeled with the dismissal cost (e.g., `self_break\n(Bonus Action)`).

**Survey evidence:** Ring of Invisibility. Likely shared by any "toggle" magic item (activate with Action, deactivate with Bonus Action or Action).

---

## Proposed encoding (once widenings land)

```dhall
{ kind = "magic_item"
, id = "ring_of_invisibility"
, name = "Ring of Invisibility"
, rarity = "legendary"
, requiresAttunement = True
, provenance = { kind = "srd-5.2.1", section = "MagicItems#Ring of Invisibility" }
, description = "While wearing this ring, you can take a Magic action to give yourself the Invisible condition. You remain Invisible until the ring is removed or until you take a Bonus Action to become visible again."
, mechanics =
    { family = "activation"
    , activationCost = { kind = "action" }
    , resource = { kind = "use_count", cap = { kind = "unlimited" } }  -- Gap 1
    , resetCadence = { kind = "never" }
    , duration =
        { kind = "permanent"
        , endsOn = [ "wearer_bonus_action" ]  -- Gap 2
        }
    , phases =
        [ { kind = "direct"
          , attachment = { kind = "self" }
          , effects = [ { kind = "apply_condition", condition = "invisible" } ]
          }
        ]
    }
, destruction = { kind = "none" }
}
```

Note: `"until ring removed"` is considered implicit in the item/attunement lifecycle and does not require a separate `endsOn` entry.
