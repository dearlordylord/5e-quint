# Proposal: Arcane Apotheosis (sorcerer L20)

**Outcome:** `structural_widening`

## Why the unit does not fit

The source text:
> "While your Innate Sorcery feature is active, you can use one Metamagic option on each of your turns without spending Sorcery Points on it."

### Gap 1 — No passive/conditional family for class features (structural)

`ClassFeatureMechanics` has exactly one family: `activation`. That family models features the **player explicitly triggers** on their turn (e.g., Action Surge: player invokes it → it grants an extra action).

Arcane Apotheosis has **no activation event**. It does not cost an action, bonus action, or reaction. The sorcerer does nothing to turn it on — it simply operates passively inside the Innate Sorcery active window. Forcing it into `activation` with `activationCost: free` would produce a misleading trace that implies a player decision point that does not exist in the rules.

A new family is needed — something like `conditional_passive` — that expresses:
- "While [guard condition: another feature is active]…"
- "…apply [passive effect] automatically."

The guard condition referencing another class feature's active state is also novel; the surface currently has no mechanism to link two features this way.

### Gap 2 — No `waive_resource_cost` effect atom

Even if a conditional-passive family existed, `ClassFeatureEffect` only has:
- `GrantExtraActionEffect` — grants an extra action
- `HealHpEffect` — restores HP

Neither can express "the Sorcery Point cost of one Metamagic option is waived per turn." A new effect atom is needed:

```
waive_resource_cost:
  resource: <resource_ref>   // sorcery_points
  for: <procedure_ref>       // metamagic_use
  limit: once_per_turn
```

### Gap 3 — Sorcery Points are not a modeled resource

The current resource vocabulary: `spell_slot`, `use_count`, `charge`, `attunement_slot`.

Sorcery Points are a sorcerer-specific renewable pool (Font of Magic). They differ from `use_count` in that they are a **currency** shared across multiple options (Metamagic, spell-slot conversions), with a specific maximum equal to the sorcerer's class level. There is no resource atom in v4 or the current surface for this.

### Gap 4 — Metamagic is not modeled

Metamagic is a sorcerer-class spell-modification system where, at the time of casting, the sorcerer may spend Sorcery Points to apply a modifier to the spell (Quickened Spell, Twinned Spell, Empowered Spell, etc.). There is no v4 atom for this system — no procedure, window, or effect category that maps to "apply a spell modifier at cast time using a class resource."

Arcane Apotheosis can only be described in terms of what it waives the cost of, so Metamagic must be nameable in the surface before this feature can be encoded.

## Proposed widenings (in priority order)

| # | Kind | Name | Why needed |
|---|------|------|------------|
| 1 | `new_subgraph` | `conditional_passive_family` | Class features that are passive while another feature is active need a new family — `activation` forces a false player-trigger. |
| 2 | `new_atom` | `sorcery_points` | Class-level renewable currency resource; not covered by any existing resource atom. |
| 3 | `new_atom` | `metamagic_use` | Sorcerer spell-modification procedure; needed to give `waive_resource_cost` a referent. |
| 4 | `new_atom` | `waive_resource_cost` | Effect that sets the cost of a named procedure to zero under a usage limit. |

## Relationship to other survey units

The Sorcerer L2 `sorcerer_metamagic_l2` unit (in the survey corpus) would presumably hit gaps 2–4 first. Arcane Apotheosis additionally requires gap 1 (the conditional passive family), since it is a modifier *on top of* the Metamagic system rather than the system itself.
