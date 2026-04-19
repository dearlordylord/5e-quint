# Proposal: Conjure Woodland Beings — Surface Gaps

## Outcome: `atom_widening`

The damage/save component encodes cleanly as `ongoing_effect` with `on_creature_enters_area` trigger, `save_gate` (Wis, caster DC), 5d8 Force damage scaled `+1d8` per slot above 4. Typecheck passes; tracer emits a valid graph.

Three gaps prevent full encoding.

---

## Gap 1 — `grant_action_as_bonus_action` (new atom — **atom_widening**)

**RAW:** "In addition, you can take the Disengage action as a Bonus Action for the spell's duration."

**Problem:** No v4 atom captures changing the action-economy cost of a standard action to a bonus action. The closest existing atoms are:

- `deny_opportunity_attack` — passive OA suppression; does not capture the action-economy change or the full scope of Disengage (preventing triggering OAs when leaving threatened squares on any movement).
- `grant_extra_action` — grants an additional *main* Action quota, not a bonus-action-cost variant of a standard action.

Neither is correct. This is a distinct mechanical shape: "for the duration, action X may be taken at the cost of a Bonus Action instead of an Action."

**Proposed widening:** New `EffectAtom` variant:

```typescript
| {
    readonly kind: "grant_action_as_bonus_action";
    readonly action: StandardActionKind;
  }
```

This is not a hypothetical edge case — the same pattern appears in other SRD units (e.g., Cunning Action, various spells that allow Dash/Disengage/Hide as a bonus action).

---

## Gap 2 — Once-per-turn dedup predicate (new `OngoingOperation` variant — **surface_widening**)

**RAW:** "A creature makes this save only once per turn."

**Problem:** Conjure Woodland Beings has three qualifying triggers:
1. Emanation enters creature's space (caster movement, maps to `on_creature_enters_area`)
2. Creature enters Emanation (`on_creature_enters_area`)
3. Creature ends its turn in the Emanation (`on_creature_ends_turn_in_area`)

All three share the same save gate. Without a per-turn-per-creature dedup predicate, encoding both `on_creature_enters_area` and `on_creature_ends_turn_in_area` as two separate operations would incorrectly allow two saves per turn for creatures that both enter and end their turn in the area.

This is the same gap as Spirit Guardians, Web, and Cloudkill — all encode only one trigger and defer the others.

**Proposed widening:** An `OngoingOperation`-level dedup field:

```typescript
export type OngoingOperation = {
  readonly trigger: OngoingTrigger;
  readonly predicate?: OngoingPredicate;
  readonly effect: OngoingEffect;
  readonly dedup?: { readonly kind: "once_per_turn_per_creature" };
};
```

When `dedup` is present, all operations sharing the same dedup group fire at most once per turn per affected creature, regardless of how many qualifying triggers fire.

---

## Gap 3 — Optional save gate (new variant on `OngoingEffect.save_gate` — **surface_widening**)

**RAW:** "you can force that creature to make a Wisdom saving throw"

**Problem:** The save is at the caster's discretion per qualifying trigger event. The current `OngoingEffect.save_gate` fires unconditionally when the trigger condition is met.

**Proposed widening:** An optional flag on the save_gate `OngoingEffect`:

```typescript
| {
    readonly kind: "save_gate";
    readonly ability: Ability;
    readonly dc: DcSource;
    readonly onFail: EffectAtom;
    readonly onSuccess: SaveSuccessOutcome;
    readonly optional?: true;  // caster chooses whether to apply
  }
```

When `optional: true`, the save fires only if the caster actively chooses to trigger it for that creature/event.

---

## Encoding decisions

- Primary trigger encoded: `on_creature_enters_area` (covers caster movement sweeping over a creature AND creatures voluntarily entering the area — the two trigger cases that RAW describes as "emanation enters space" and "creature enters emanation").
- `on_creature_ends_turn_in_area` deferred (Gap 2 dependency).
- Save encoded as mandatory (Gap 3 omitted — encode as if always fires).
- Disengage-as-BA entirely omitted (Gap 1 — no atom exists).
