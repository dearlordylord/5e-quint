# Proposal: Dancing Sword — Structural Widening

## Outcome

`structural_widening` — the unit cannot be encoded at all because `magic_item` is not a valid `UnitRecord` kind in `types.ts`, and even with that gap closed the unit's core mechanic requires a new family.

## Gap 1: MagicItemRecord (blocking — kind missing)

`UnitRecord` is currently:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. `tracer.ts`'s `traceUnit` switch is exhaustive over these three kinds; a `magic_item` JSON would throw at runtime. The taxonomy lists `magic_item_root` as a fully validated source atom (24 items, 2 rounds per TAXONOMY_atoms_graph.md §14), but no surface type or tracer branch has been added yet.

Minimum addition needed:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | MagicItemRecord;
```

## Gap 2: attack_proxy family (blocking — family missing)

The Dancing Sword's entire point is creating an autonomous weapon proxy:

> "the weapon begins to hover, flies up to 30 feet, and attacks one creature of your choice within 5 feet of itself. The weapon uses your attack roll and adds your ability modifier to damage rolls."

This does not fit any existing mechanics family:

| Family | Why it fails |
|---|---|
| `ongoing_effect` | Models a persistent modifier/rider on the wielder or a marked target — not an autonomous weapon making separate attacks |
| `activation` | Models an instant one-shot or phased resolution — not a multi-turn autonomous attacker |
| `triggered_reaction` | Models a reaction-window spell — unrelated shape |
| `anchored_trigger` | Models a planted trigger released by future events — unrelated shape |
| `on_hit_trigger` (mastery) | Models an on-hit rider on a single attack — cannot model the proxy's own attack loop |

The v4 taxonomy already anticipates this shape with atoms `create_attack_proxy` (effect), `attack_proxy` (attachment), and `command_companion` (analogous procedure for proxy-directing Bonus Actions), but no surface family wires them together.

Proposed new family (sketch — not a complete spec):

```typescript
export type AttackProxyMechanics = {
  readonly family: "attack_proxy";
  readonly activationCost: ClassFeatureActivationCost; // bonus_action to launch
  readonly proxyWeapon: "wielded_weapon";              // proxy uses the item itself
  readonly proxyAttackBasis: "wielder_attack_roll";    // uses wielder's roll + mod
  readonly chargeLimit: number;                        // 4 attacks before auto-return
  readonly repositionCost: ClassFeatureActivationCost; // bonus_action to reposition
  readonly returnConditions: ReadonlyArray<ProxyReturnCondition>;
};

export type ProxyReturnCondition =
  | { readonly kind: "charge_exhausted" }
  | { readonly kind: "wielder_grasps" }
  | { readonly kind: "wielder_distance_exceeded"; readonly feet: number };
```

The `chargeLimit` drives a `charge` resource atom (already in v4) with a countdown-to-return lifecycle rather than a refill lifecycle. The `repositionCost` drives a repeatable `bonus_action_quota` consumption on subsequent turns.

## Gap 3: Attunement surface type (secondary)

The v4 taxonomy lists `attune` as a procedure atom and `attunement_slot` as a resource atom, but neither appears in `types.ts`. Any `MagicItemRecord` that requires attunement needs these surfaced. Minimum:

```typescript
export type AttunementRequirement =
  | { readonly required: false }
  | { readonly required: true; readonly restriction?: string }; // e.g. "by a spellcaster"
```

## What fits cleanly once the gaps are closed

Once `MagicItemRecord` and `attack_proxy` family exist, the Dancing Sword maps straightforwardly:

- Activation: Bonus Action (toss the sword)
- Proxy: uses wielder's attack roll and ability modifier to damage
- Charge: 4 attacks (tracked as `charge` resource, no refill — consumed until auto-return)
- Reposition: Bonus Action each subsequent turn, ≤ 30 ft, optional attack
- Return conditions: charge exhausted | wielder grasps | distance > 30 ft
- Cessation on return: proxy terminates, `charge` resets (item held again)

No ambiguity in the rules text; no DM-agenda items (the mechanic is deterministic once the proxy shape exists).
