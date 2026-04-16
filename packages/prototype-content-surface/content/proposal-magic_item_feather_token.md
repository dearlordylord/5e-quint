# Proposal: Feather Token — Structural Widening

## Outcome: `structural_widening`

The Feather Token cannot be encoded because no `MagicItemRecord` kind exists in `UnitRecord`. The surface defines only `SpellRecord`, `ClassFeatureRecord`, and `MasteryRecord`. The v4 taxonomy includes `magic_item_root` as a source atom, but no corresponding TypeScript surface type, mechanics family, or tracer branch exists.

---

## Gap 1 — Missing top-level kind: `MagicItemRecord`

**What is needed:** A new arm of `UnitRecord` with `kind: "magic_item"`. At minimum this requires:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly rarity: MagicItemRarity;
  readonly mechanics: MagicItemMechanics;
};
```

The tracer's top-level `switch (unit.kind)` needs a `"magic_item"` branch routing to a new `traceMagicItemUnit` function.

---

## Gap 2 — Missing family envelope: multi-variant item

Feather Token is not a single item with one effect — it is a **family of 6 tokens** chosen randomly. The surface has no shape for a dispatched-variant item. Two plausible designs:

**Option A — Six separate records** (one per token type, each with `id: "feather_token_anchor"` etc.). Simpler to encode but loses the table-dispatch relationship.

**Option B — Variant-family envelope** with a `variants` array, each entry having its own `id`, `rarity`, and `mechanics`. Accurately captures the "one token, random type" structure at the cost of a new surface shape.

---

## Gap 3 — Missing lifecycle shape: single-use with item destruction

Each token is permanently destroyed when used. The v4 `charge` atom covers per-use depletion but there is no surface shape for **item-ceases-to-exist-on-expend**. A new expiry variant is needed:

```typescript
{ readonly kind: "destroyed_on_use" }
```

This is distinct from `use_count` reaching zero (item persists, inert) or concentration ending (item persists, effect ends).

---

## Gap 4 — Missing mechanics shape: Whip token (attack proxy with per-turn redirect)

The Whip token is the most mechanically rich variant. It:

1. Costs a Magic action to deploy (token → floating whip proxy).
2. The proxy makes a melee spell attack on deployment or on subsequent Bonus Actions.
3. Each Bonus Action, the wielder can **redirect** the proxy up to 20 feet before the attack.
4. Duration: 1 hour, or dismissal (Magic action), or wielder dies / is Incapacitated.

The v4 atom `create_attack_proxy` exists. What is missing is a **redirect mechanics shape** — a per-turn repositioning cost paid via `bonus_action_quota` that moves the proxy before it attacks. The existing `OnHitTriggerMechanics` and spell attack patterns do not model a persistent, steerable proxy.

Approximate new surface shape needed:

```typescript
export type AttackProxyRedirect = {
  readonly kind: "bonus_action_redirect";
  readonly maxFeet: number;
};

export type MagicItemAttackProxyMechanics = {
  readonly family: "attack_proxy";
  readonly deploymentCost: ClassFeatureActivationCost;
  readonly proxy: {
    readonly attackBonus: number;          // fixed +9
    readonly attackKind: AttackKind;       // melee_spell_attack
    readonly onHit: DamageEffect;
    readonly redirect?: AttackProxyRedirect;
  };
  readonly duration: Duration;
  readonly dismissal?: { readonly kind: "magic_action" };
  readonly endsIf?: ReadonlyArray<"owner_dies" | "owner_incapacitated">;
};
```

---

## Gap 5 — Companion creation with movement constraints (Bird token)

The Bird token creates a creature with Roc statistics but modified behavior (no attacks, simple command obedience, carry capacity, hourly rest requirement, distance cap). This maps to `create_companion` in v4 but the surface has no shape for companion creation with imposed stat overrides and conditional-distance expiry. Out of scope for the current `ClassFeatureMechanics` patterns.

---

## Per-token encodability summary

| Token | Primary atoms needed | Encodable today? |
|---|---|---|
| Anchor | `block_travel`, `create_object` analog, `action_quota` | No — no `MagicItemRecord` |
| Bird | `create_companion`, modified-stat companion | No — `MagicItemRecord` missing + companion stat overrides missing |
| Fan | `modify_speed` on vehicle, `create_object` analog | No — `MagicItemRecord` missing + vehicle target missing |
| Swan Boat | `create_object` (vehicle), command mechanic | No — `MagicItemRecord` missing |
| Tree | `create_object` (nonmagical, permanent) | No — `MagicItemRecord` missing |
| Whip | `create_attack_proxy`, `attack_roll`, `damage`, `bonus_action_quota` | No — `MagicItemRecord` missing + redirect shape missing |

Whip is the closest to encodable once a `MagicItemRecord` exists; Anchor and Tree are next simplest; Bird is the most complex.

---

## Recommended widening sequence

1. **Add `MagicItemRecord`** to `UnitRecord` with a `magic_item` mechanics family concept and tracer branch. This unblocks all 24 item slots in the survey queue.
2. **Add single-use destruction lifecycle** (Gap 3) — needed by Feather Token and most consumable items.
3. **Choose variant strategy** (Gap 2, Option A or B) — Option A (separate records) is lower friction for the surface; Option B is more semantically accurate.
4. **Add attack-proxy redirect shape** (Gap 4) — needed for Whip variant; deferred until the MagicItemRecord foundation exists.
