# Proposal: Widenings required for Potion of Growth

## Unit

**Potion of Growth** — Magic Item, Uncommon (SRD 5.2.1, Magic Items / Items I-P)

## Outcome

`atom_widening` — the structural shell fits (MagicItemRecord + ActivatedAbilityMechanics), but three of the Enlarge effect's constituent mechanics have no representation in the current surface.

## SRD text (Enlarge effect, via Enlarge/Reduce)

> The target's size increases by one category—from Medium to Large, for example. The target also has Advantage on Strength checks and Strength saving throws. The target's attacks with its enlarged weapons or Unarmed Strikes deal an extra 1d4 damage on a hit.

Potion of Growth delivers this for 10 minutes with no Concentration required.

## What fits

The outer shell encodes cleanly:

- `kind = "magic_item"`, `rarity = "uncommon"`, `requiresAttunement = false`
- `mechanics.family = "activation"`
- `activationCost = { kind: "action" }` (drinking a potion is an Action)
- `resource = { kind: "use_count", cap: { kind: "fixed", uses: 1 } }` (single-use consumable)
- `resetCadence = { kind: "never" }` (no refill — pair with `destruction: { kind: "permanent_on_empty" }`)
- `duration = { kind: "timed", value: { unit: "minute", amount: 10 } }` (no concentration)
- `phases = [{ kind: "direct", attachment: { kind: "self" }, effects: [...] }]`

## What is missing

### 1. `modify_size_category` — new EffectAtom

**Classification:** `atom_widening`

The core transformation of the Enlarge effect is a size-category step up. There is no EffectAtom in the current surface that models a change to a creature's size category. The v4 taxonomy does not include a `modify_size_category` or equivalent atom.

**Proposed shape:**

```typescript
| {
    readonly kind: "modify_size_category";
    readonly direction: "increase" | "decrease";
    readonly steps: number; // almost always 1
  }
```

Reduce (the other half of Enlarge/Reduce) would use `direction: "decrease"`. Both the potion and a future Reduce encoding benefit from this atom.

**Evidence:** "The target's size increases by one category—from Medium to Large, for example."

---

### 2. `grant_bonus_attack_damage` — new EffectAtom

**Classification:** `atom_widening`

The Enlarge effect grants extra 1d4 damage on weapon attacks and Unarmed Strikes. This is a **passive damage rider on the attacker's own outgoing hits** — not a modifier to the attack roll itself. `modify_roll_numeric` targets d20 rolls (attack rolls, saving throws, ability checks); it does not apply to damage rolls. No existing EffectAtom covers "attacker's weapon/unarmed attacks deal extra NdM damage per hit."

**Proposed shape:**

```typescript
| {
    readonly kind: "grant_bonus_attack_damage";
    readonly amount: DiceAmount;
    readonly attackKind: "weapon_or_unarmed" | "weapon" | "unarmed";
    // damageType absent = untyped addend (inherits weapon's damage type per RAW)
    readonly damageType?: DamageType;
  }
```

The Reduce variant would need a **damage reduction** rider: "1d4 less damage on a hit (can't reduce below 1)". That could be the same atom with a `sign: "-"` field, or a companion `reduce_attack_damage` atom.

**Evidence:** "The target's attacks with its enlarged weapons or Unarmed Strikes deal an extra 1d4 damage on a hit."

---

### 3. `modify_roll_advantage.abilityCheckFilter` — new surface variant

**Classification:** `surface_widening`

`modify_roll_advantage` already has `saveAbilityFilter?: ReadonlyNonEmptyArray<Ability>` to narrow saving-throw advantage to a specific ability. The Enlarge effect grants advantage on Strength *checks* (not all ability checks), so an equivalent `abilityCheckFilter` field is needed. Without it, "advantage on Strength checks" cannot be represented without also granting advantage on all other ability checks.

**Proposed addition to `modify_roll_advantage`:**

```typescript
// Narrows ability-check advantage riders to checks using a specific ability.
// Parallel to saveAbilityFilter for saving throws.
readonly abilityCheckFilter?: ReadonlyNonEmptyArray<Ability>;
```

**Evidence:** "The target also has Advantage on Strength checks and Strength saving throws."

---

## Why no partial encoding was attempted

The three missing pieces together cover the entire payload of the Enlarge effect. Encoding only the saving-throw half of the advantage grant (which *is* expressible via `saveAbilityFilter`) while omitting size change and bonus weapon damage would produce a materially misleading trace — the resulting graph would describe a different, weaker ability. Per the guardrails, a misleading trace is worse than no trace.

## Related units that share these atoms

- **Enlarge/Reduce (spell)** — same three atoms needed; the Potion of Growth is strictly a timed, no-concentration delivery vehicle for the Enlarge branch.
- **Reduce (via Enlarge/Reduce)** — `modify_size_category` with `direction: "decrease"` + disadvantage on Strength rolls + damage-reduction rider.
- Any future size-manipulation spells or items (Giant Strength potion adjacency, Enlarge-like class features).
