# Proposal: Dancing Lights — surface_widening

## Unit

- Name: Dancing Lights
- Slug: `dancing_lights`
- Kind: spell (cantrip, Illusion)
- Provenance: srd-5.2.1

## Why it doesn't fit

Dancing Lights fits the `ongoing_effect` family structurally: concentration, 1-minute duration, Action casting time, 120-ft point range, no spell slot (level 0). All header fields encode cleanly.

It fails at `OngoingOperation`. The current surface supports only:

- `roll_modifier` — modifies attack rolls or saving throws
- `damage_on_hit` — adds damage when the caster hits a creature in the attachment's scope

Dancing Lights has neither. Its mechanic is:

1. **Create persistent floating objects** (up to four lights, or one humanoid form) that shed Dim Light.
2. **Optional per-turn Bonus Action** to reposition those objects within range and adjacency constraints.

The v4 atom `create_object` exists in the taxonomy (Effect Atoms section) but is not reachable from any `OngoingOperation` variant. No honest encoding is possible without adding at least the first variant; encoding without both would silently drop the repositioning mechanic.

## Proposed widenings

### Gap 1: `create_object` variant in `OngoingOperation`

Minimal shape:

```typescript
export type CreateObjectOperation = {
  readonly kind: "create_object";
  readonly count: number;          // "up to four"
  readonly light?: {
    readonly radiusFeet: number;   // 10 ft
    readonly lightLevel: "dim" | "bright";
  };
};
```

Evidence: *"You create up to four torch-size lights within range… each light sheds Dim Light in a 10-foot radius."*

This variant maps directly to the v4 `create_object` effect atom. No new atom is needed.

### Gap 2: `reposition_objects` variant in `OngoingOperation`

The Bonus Action repositioning is a recurring optional per-turn cost to move created objects. It is mechanically distinct from:

- `mark transfer` — fires on a named event, not per-turn
- `roll_modifier` / `damage_on_hit` — no cost, no movement

Minimal shape:

```typescript
export type RepositionObjectsOperation = {
  readonly kind: "reposition_objects";
  readonly cost: { readonly kind: "bonus_action" };
  readonly moveFeet: number;          // 60 ft
  readonly adjacencyConstraintFeet?: number; // 20 ft (each light must stay within 20 ft of another)
};
```

Evidence: *"As a Bonus Action, you can move the lights up to 60 feet to a space within range. A light must be within 20 feet of another light created by this spell, and a light vanishes if it exceeds the spell's range."*

The adjacency constraint ("within 20 ft of another light") is a light-level consistency rule that may warrant its own sub-field rather than being folded into notes, since it governs object survival during the reposition.

## Classification rationale

- **`surface_widening`** not `atom_widening`: `create_object` is already in v4; the gap is in the surface type `OngoingOperation`, not in the atom inventory.
- **`surface_widening`** not `structural_widening`: the `ongoing_effect` family is the correct family; no new top-level family or cross-family composition is required.
- **Not `dm_agenda`**: creating light sources and repositioning them is a deterministic mechanical effect, not a DM-adjudicated outcome.

## Atoms that would be emitted (once surface is widened)

| Atom | Category | Notes |
|---|---|---|
| `spell_root` | source | |
| `activate` | procedure | |
| `action_quota` | resource | casting time |
| `concentration_lock` | resource | |
| `concentrate` | lifecycle | |
| `expire` | lifecycle | ≤ 1 minute |
| `target` | attachment | range 120 ft (point); the lights float in a designated area |
| `create_object` | effect | up to 4 lights (or 1 humanoid form) |
| `bonus_action_quota` | resource | consumed when repositioning |

Relations: `roots`, `consumes`, `grants`, `attaches_to`, `persists_until`
