# Proposal: Silent Image widening

## Unit

**Silent Image** — Level 1 Illusion, Concentration ≤ 10 min, SRD 5.2.1

## Outcome: `surface_widening`

The `ongoing_effect` family is the correct structural fit. The spell is concentration, attaches to an area, and persists with no attack roll or saving throw on cast. All gaps are missing *variants of existing surface types*, not missing v4 atoms.

---

## Gap 1 — `create_object` variant of `OngoingOperation`

**Current state:** `OngoingOperation = RollModifierOperation | DamageOnHitOperation`

**What's missing:** A third variant that models creating a persistent visual/physical object in the spell's area for the duration. The v4 atom `create_object` already exists in the taxonomy — it just needs a corresponding surface type so it's reachable from `ongoing_effect` mechanics.

**Proposed shape (sketch):**

```typescript
export type CreateObjectOperation = {
  readonly kind: "create_object";
  readonly shape: { readonly kind: "cube"; readonly maxSideFeet: number };
  readonly sensoryProfile: ReadonlyArray<"visual" | "audible" | "olfactory" | "tactile">;
};
```

Silent Image: `{ kind: "create_object", shape: { kind: "cube", maxSideFeet: 15 }, sensoryProfile: ["visual"] }`

`sensoryProfile` cleanly distinguishes Silent Image (visual only) from Major Image (visual + audible + olfactory + thermal) when that spell is encoded.

---

## Gap 2 — Magic-action reposition rider

**What's missing:** A way to model "during the duration, the caster can spend their Magic action to move the created object to any spot within range".

This is a recurring optional sub-activation on an `ongoing_effect` — the caster pays the Magic action quota to reposition (and re-skin) the object. There is no current slot in `OngoingEffectMechanics` for recurring optional activations.

**Proposed addition to `OngoingEffectMechanics`:**

```typescript
export type RepositionRider = {
  readonly kind: "reposition";
  readonly cost: { readonly kind: "magic_action" };
  readonly target: "within_range";
};

// Add optional field to OngoingEffectMechanics:
// readonly repositionRider?: RepositionRider;
```

This is narrow and composable. Future spells with bonus-action-repositionable objects would use `cost: { kind: "bonus_action" }`.

---

## Gap 3 — Creature-side Investigation check dispel gate

**What's missing:** A way to model "a creature that takes the Study action and succeeds on an Intelligence Investigation check against the caster's spell save DC can see through the illusion".

This is a creature-initiated `ability_check` that acts as a partial-pierce gate on the ongoing effect. It differs from `save_gate` (which is caster-initiated on cast) and from `condition_progression`. The v4 atom `ability_check` exists but the surface has no variant in `OngoingEffectMechanics` for "creature-side ability check that modifies how the ongoing effect is perceived by that creature".

**Proposed addition:**

```typescript
export type PierceGate = {
  readonly kind: "pierce_gate";
  readonly action: "study";
  readonly check: { readonly kind: "ability_check"; readonly ability: Ability; readonly skill: string };
  readonly dc: DcSource;
  readonly onSuccess: { readonly kind: "see_through" };
};

// Add optional field to OngoingEffectMechanics:
// readonly pierceGate?: PierceGate;
```

`see_through` is the narrowest honest outcome name ("the creature can see through the image"). Widen to other illusion-collapse outcomes as Major Image and Phantasmal Force land.

---

## Encoding plan (once widened)

With the three additions above, the full encoding is:

```dhall
{ family = "ongoing_effect"
, attachment = { kind = "area"
               , shape = { kind = "cube", maxSideFeet = 15 }
               , origin = { kind = "point_within_range" }
               }
, operation = { kind = "create_object"
              , shape = { kind = "cube", maxSideFeet = 15 }
              , sensoryProfile = [ "visual" ]
              }
, repositionRider = Some { kind = "reposition"
                          , cost = { kind = "magic_action" }
                          , target = "within_range"
                          }
, pierceGate = Some { kind = "pierce_gate"
                     , action = "study"
                     , check = { kind = "ability_check", ability = "int", skill = "investigation" }
                     , dc = { kind = "caster_spell_save_dc" }
                     , onSuccess = { kind = "see_through" }
                     }
}
```

## v4 atom coverage

All proposed atoms are already in v4:
- `create_object` — Effect Atoms §9
- `ability_check` — Resolution Atoms §5

No new atoms are being proposed. All three gaps are surface (types.ts) gaps only.
