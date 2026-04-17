# Proposal: magic_item_boots_of_speed — surface_widening

## Unit

**Boots of Speed** (Wondrous Item, Rare, Requires Attunement)

> While you wear these boots, you can take a Bonus Action to click the boots' heels together. If you do, the boots double your Speed, and any creature that makes an Opportunity Attack against you has Disadvantage on the attack roll. If you click your heels together again, you end the effect.
>
> When you've used the boots' property for a total of 10 minutes, the magic ceases to function for you until you finish a Long Rest.

## Why this unit does not fit the current surface honestly

The item is conceptually a `magic_item` with an `activation` mechanics family. The two core mechanical payloads already exist:

- doubling Speed maps to `set_speed_ratio { numerator = 2, denominator = 1 }`
- disadvantage on OA attack rolls maps in principle to `modify_roll_advantage`

The problem is not missing atoms. The problem is that the current activation surface cannot express the item's stateful runtime and narrowing conditions without lying.

## Gap 1 — pooled active duration, not a discrete use

Current activated-item resources are:

- `use_count`
- `charge_pool`

Neither matches Boots of Speed.

This item does **not** spend one use to get a fixed 10-minute duration. It has a shared runtime budget:

- activate with a Bonus Action;
- remain active until turned off;
- later reactivate again;
- once the cumulative active time reaches 10 minutes, the item stops functioning until a Long Rest.

That is not:

- a fixed use count,
- a charge pool spent on activation,
- or a normal timed duration.

Required widening:

```typescript
type ActivationResource =
  | UseCountResource
  | ChargePoolResource
  | {
      readonly kind: "active_duration_pool";
      readonly cap: DurationValue;
    };
```

Or an equivalent shape that explicitly models a shared active-time budget.

Evidence:

> "When you've used the boots' property for a total of 10 minutes, the magic ceases to function for you until you finish a Long Rest."

## Gap 2 — stateful toggle activation

Current `ActivatedAbilityMechanics` can express:

- an activation cost,
- a resource,
- a reset cadence,
- an optional duration,
- one or more activation phases.

What it cannot express is this pattern:

1. Bonus Action turns the effect **on**
2. effect persists
3. Bonus Action turns the effect **off**
4. remaining budget is preserved for future reactivation

A plain timed duration would be false, because the effect does **not** automatically run for a full 10 minutes once activated. It can end early and be resumed later.

Required widening: a toggle-oriented activation variant or subgraph within the existing activation family, rather than a one-shot duration only.

Evidence:

> "If you click your heels together again, you end the effect."

## Gap 3 — `modify_roll_advantage` cannot narrow to Opportunity Attacks only

The disadvantage rider is not "creatures have disadvantage on attack rolls against you." It is specifically:

- only attack rolls,
- only the Opportunity Attack subset,
- only against the wearer while the boots are active.

Current `modify_roll_advantage` can narrow by:

- roll kind
- attacker creature type
- skill
- save ability
- count / expiry

It cannot say "only Opportunity Attacks."

Using:

```typescript
{ kind = "modify_roll_advantage", mode = "disadvantage", on = [ "attack_roll" ] }
```

would incorrectly penalize all attack rolls against the wearer.

Using `deny_opportunity_attack` would be even worse, since the boots do not prevent Opportunity Attacks; they only impose disadvantage.

Required widening:

```typescript
type ModifyRollAdvantage =
  ...
  & { readonly attackContextFilter?: "opportunity_attack" };
```

or equivalent.

Evidence:

> "any creature that makes an Opportunity Attack against you has Disadvantage on the attack roll"

## Classification

All three gaps are within existing kinds/families and existing v4 atom intent:

- `magic_item` kind already exists
- `activation` family already exists
- speed doubling is already covered by `set_speed_ratio`
- the OA rider belongs under `modify_roll_advantage`, but needs a narrower filter

So this is **`surface_widening`**, not `atom_widening` and not `structural_widening`.

## Consequence for this worker

No `content/magic_item_boots_of_speed.dhall` was authored.

Any currently-valid encoding would misstate at least one of:

- the shared 10-minute runtime budget,
- the on/off toggle semantics,
- or the Opportunity-Attack-only scope of the disadvantage rider.
