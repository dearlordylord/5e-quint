`Wind Fan` fits the existing top-level record kind and mechanics family in principle:

- `kind = "magic_item"`
- mechanics family = `activation`
- core effect = `grant_spell_access` for `gust_of_wind`

But the current surface cannot encode two material rules honestly.

## Gap 1 — fixed item spell save DC

Existing `grant_spell_access` records only the granted spell id and casting mode. It has no way to override the spell's save DC with an item-fixed DC.

Why this matters:

- `Gust of Wind` uses saving throws during its resolution.
- The item text sets that DC to a fixed printed value, independent of the holder.
- Encoding this as plain `grant_spell_access { spellId = "gust_of_wind", ... }` would silently fall back to normal spell resolution semantics and lose the fixed DC.

Proposed widening:

- `new_variant`: `grant_spell_access.fixed_save_dc`

Possible shape:

```ts
type GrantSpellAccessEffect = {
  kind: "grant_spell_access";
  spellId: string;
  mode: SpellAccessMode;
  fixedSaveDc?: number;
};
```

Evidence:

> "you can cast *Gust of Wind* (save DC 13) from it."

## Gap 2 — cumulative pre-dawn failure chance with destruction on failure

The item does not use a charge pool or fixed use-count. Instead, each use before the next dawn increases the chance that the item fails to work, and failure destroys the item.

Current shapes do not cover this:

- `ActivationResource.use_count` requires a cap; `Wind Fan` has no fixed maximum number of uses before dawn.
- `ActivationResource.charge_pool` models numeric charges spent per activation; `Wind Fan` has no charge pool.
- `ItemDestructionPolicy.last_charge_roll` only covers the SRD wand idiom "when the last charge is expended, roll ...".
- `ItemDestructionPolicy.permanent_on_empty` only covers deterministic destruction on pool exhaustion.
- `RestResetCadence.dawn` can model a dawn reset, but there is no paired state shape for "cumulative X% failure chance based on number of uses since dawn".

This is still a surface problem, not a new v4 atom problem: the mechanics can continue to trace through existing item / grant_spell_access / duration-window / item-destruction concepts. What is missing is a surface variant that records this specific use-state policy honestly.

Proposed widening:

- `new_variant`: `MagicItemActivationFailurePolicy.cumulative_percent_by_use_until_dawn`

One plausible shape:

```ts
type MagicItemActivationFailurePolicy =
  | { kind: "none" }
  | {
      kind: "cumulative_percent_by_use_until_dawn";
      percentPerReuse: number;
      destroysItemOnFailure: true;
    };
```

or, if kept on destruction/lifecycle instead:

```ts
type ItemDestructionPolicy =
  | { kind: "none" }
  | { kind: "last_charge_roll"; die: number; destroyOn: number }
  | { kind: "permanent_on_empty" }
  | {
      kind: "cumulative_use_failure";
      reset: "dawn";
      percentPerReuse: number;
      destroyedOnFailure: true;
    };
```

Evidence:

> "Each subsequent time the fan is used before the next dawn, it has a cumulative 20 percent chance of not working; if the fan fails to work, it tears into useless, nonmagical tatters."

## Verdict

Outcome: `surface_widening`

Reason:

- The top-level kind exists.
- The mechanics family exists.
- The missing pieces are variants/fields on the existing magic-item spell-access surface, not a brand-new family and not a brand-new v4 atom.
