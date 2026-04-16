# Proposal: Chain Lightning — surface_widening

## Unit

- **Name:** Chain Lightning
- **Kind:** spell
- **Level:** 6 (Evocation)
- **Provenance:** srd-5.2.1

## Outcome

`surface_widening` — the `activation` spell family is correct; the `save_gate` phase and `damage` effect atoms all exist in v4. What is missing is a surface grammar shape for the secondary-bolt attachment.

## What Chain Lightning needs

The spell fires in two logical phases:

1. **Primary bolt** — one target within 150 ft makes a DEX save: 10d8 Lightning on fail, half on success.
2. **Secondary bolts** — up to 3 targets (scaled: +1 per slot above 6), each _chosen by the caster_, each _constrained to within 30 ft of the primary target_, make the same save for the same damage.

Phase 1 encodes cleanly:
```
attachment: { kind: "target", selection: { mode: "one" } }
phase: { kind: "save_gate", ability: "dex", dc: caster_spell_save_dc, onFail: 10d8 lightning, onSuccess: 5d8 lightning }
```

Phase 2 cannot be encoded honestly with existing types.

## Why existing Attachment shapes fail

### `target` with `choose_up_to`

```typescript
{ kind: "target", selection: { mode: "choose_up_to", count: { kind: "linear", base: 3, perSlotAboveBase: 1, baseLevel: 6 } } }
```

This captures the count and slot scaling correctly but **loses the 30-ft-from-primary constraint**. The `target` attachment implies the caster may pick any visible target within the spell's full 150 ft range. That is not what the SRD says. Encoding this would produce a trace showing unconstrained choice over the full range — a false trace.

### `area` with `on_primary_target` origin

```typescript
{ kind: "area", shape: { kind: "sphere", radiusFeet: 30 }, origin: { kind: "on_primary_target" } }
```

This captures the spatial anchor correctly but says **all creatures in the sphere** take the effect. Chain Lightning lets the caster choose up to 3 from within that sphere. An area trace implies automatic area coverage — also a false trace.

## Proposed widening

Add a new `TargetSelection` mode that combines player choice with a spatially anchored pool:

```typescript
// Option A — extend TargetSelection
type TargetSelection =
  | { readonly mode: "one" }
  | { readonly mode: "choose_up_to"; readonly count: SlotScaling<number> }
  | {
      readonly mode: "choose_up_to_from_area";
      readonly count: SlotScaling<number>;
      readonly area: { readonly kind: "sphere"; readonly radiusFeet: number };
      readonly origin: AreaOrigin;   // "on_primary_target" for Chain Lightning
    };
```

Or equivalently a new `Attachment` kind:

```typescript
// Option B — new Attachment kind
| {
    readonly kind: "targeted_from_area";
    readonly count: SlotScaling<number>;
    readonly area: { readonly kind: "sphere"; readonly radiusFeet: number };
    readonly origin: AreaOrigin;
  }
```

Option A is narrower (re-uses existing `target` attachment kind, adds a mode). Option B is more explicit at the kind level.

With either option, the full encoding becomes:

```
phases: [
  {
    kind: "save_gate",
    attachment: { kind: "target", selection: { mode: "one" } },
    ability: "dex",
    dc: { kind: "caster_spell_save_dc" },
    onFail:    { kind: "damage", damageType: "lightning", amount: { kind: "fixed", expr: { dice: 10, dieSize: 8 } } },
    onSuccess: { kind: "damage", damageType: "lightning", amount: { kind: "fixed", expr: { dice: 5, dieSize: 8 } } }
  },
  {
    kind: "save_gate",
    attachment: {
      kind: "targeted_from_area",          // NEW
      count: { kind: "linear", base: 3, perSlotAboveBase: 1, baseLevel: 6 },
      area: { kind: "sphere", radiusFeet: 30 },
      origin: { kind: "on_primary_target" }
    },
    ability: "dex",
    dc: { kind: "caster_spell_save_dc" },
    onFail:    { kind: "damage", damageType: "lightning", amount: { kind: "fixed", expr: { dice: 10, dieSize: 8 } } },
    onSuccess: { kind: "damage", damageType: "lightning", amount: { kind: "fixed", expr: { dice: 5, dieSize: 8 } } }
  }
]
```

## Atoms and relations

No new v4 atoms or relations are needed. The `save_gate`, `damage`, and `scale_die_count` atoms all exist. The `branches_on_completion` relation handles phase sequencing. The `on_primary_target` area origin already exists in `AreaOrigin`.

## Pressure source

This is the first spell in the survey that requires multi-target player choice _anchored at another target_. The existing grammar has the area-origin concept (`on_primary_target`) and the choice concept (`choose_up_to`) but no composition of the two. The widening is narrow — one new `TargetSelection` mode (or `Attachment` kind) closes the gap for Chain Lightning and likely for future chained-effect spells (e.g., Witch Bolt secondary, Steel Wind Strike multi-target).

## SRD evidence

> "Three bolts then leap from that target to as many as three other targets of your choice, each of which must be within 30 feet of the first target."

> "One additional bolt leaps from the first target to another target for each spell slot level above 6."
