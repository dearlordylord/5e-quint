# Proposal: Speak with Animals widening

## Outcome: `atom_widening`

Speak with Animals cannot be honestly encoded under the current surface. Two v4 atoms are missing, and the `OngoingOperation` surface type is too narrow to carry them.

---

## Unit summary

| Field | Value |
|---|---|
| Level | 1 |
| School | Divination |
| Casting time | 1 Action (also Ritual) |
| Range | Self |
| Components | V, S |
| Duration | Timed — 10 minutes (not concentration) |
| Effect 1 | Comprehend and verbally communicate with Beasts |
| Effect 2 | Use any of the Influence action's skill options with Beasts |

---

## Primary blockers

### 1. `ongoing_effect.operation` is too narrow

The spell naturally belongs to the `ongoing_effect` family: it is a timed, non-concentration persistent grant that stays active for 10 minutes after a 1-action cast. The mechanics header fields (level, school, castingTime, range, components, duration) all fit without issue.

The blocker is `OngoingOperation`:

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Both variants describe what happens to rolls or damage. Speak with Animals does not modify rolls or add damage. It grants two capabilities to the caster. There is no `OngoingOperation` variant for "grant a capability."

A new variant is needed, roughly:

```typescript
export type GrantCapabilityOperation = {
  readonly kind: "grant_capability";
  readonly capability: GrantedCapability;  // new type, see below
};
```

### 2. Missing v4 atom: beast communication

The first capability — "comprehend and verbally communicate with Beasts" — has no v4 atom. Review of the full v4 inventory:

- `grant_sense` — perceptual extension (darkvision, truesight). Communication is not a sense.
- `telepathic_link` — a directed mental conduit between specific creatures. Speak with Animals is language comprehension, not a telepathic link. The mechanism is different (natural beast communication is interpreted, not mind-linked).
- `grant_proficiency` — grants a skill/tool proficiency. Not applicable.
- No other effect atom is remotely applicable.

**Proposed atom:** `grant_creature_communication` (or `grant_language_comprehension`)

Shape sketch:

```typescript
export type GrantCreatureCommunicationEffect = {
  readonly kind: "grant_creature_communication";
  readonly creatureType: CreatureType;  // "beast" — new type needed or string
  readonly modes: ReadonlyArray<"comprehend" | "verbal">;
};
```

### 3. Missing v4 atom: Influence-option access by creature type

The second capability — "use any of the Influence action's skill options with them" — is distinct from communication. It expands the action economy by making a normally inaccessible action option (Influence skill options against Beasts) available. No v4 atom covers this either.

**Proposed atom:** `grant_action_option_access`

Shape sketch:

```typescript
export type GrantActionOptionAccessEffect = {
  readonly kind: "grant_action_option_access";
  readonly action: StandardActionKind;  // "influence"
  readonly restrictedTo: { creatureType: CreatureType };
};
```

---

## Secondary blocker: dual casting time (Action + Ritual)

Speak with Animals has a standard casting time of 1 Action AND the Ritual tag. The current `CastingTime` type can only hold one value:

```typescript
export type CastingTime =
  | { readonly kind: "action" }
  | { readonly kind: "minutes"; readonly amount: number; readonly ritual: boolean; }
  // ...
```

A ritual-capable Action spell has two valid casting modes: `{ kind: "action" }` (normal) and `{ kind: "minutes", amount: 11, ritual: true }` (ritual, which adds 10 minutes). These cannot be expressed in a single `CastingTime` field.

This is a `surface_widening` gap affecting all ritual-capable spells with a sub-minute standard casting time (Speak with Animals, Identify, Comprehend Languages, Detect Magic, etc.).

**Proposed surface variant:**

```typescript
| {
    readonly kind: "action_or_ritual";
    readonly ritualExtraMinutes: number;  // typically 10
  }
```

Or alternatively, `CastingTime` becomes an array / discriminated union that allows both modes to coexist. This is a separate widening from the atom gap.

---

## Widening priority

| # | Gap | Kind | Blocks |
|---|---|---|---|
| 1 | `OngoingOperation::grant_capability` variant | `surface_widening` | Any ongoing effect that grants a capability rather than modifying a roll/damage |
| 2 | `grant_creature_communication` v4 atom | `atom_widening` | Speak with Animals, Speak with Dead, Speak with Plants, Tongues, Comprehend Languages |
| 3 | `grant_action_option_access` v4 atom | `atom_widening` | Speak with Animals (Influence options), possibly charm effects that unlock social options |
| 4 | `CastingTime::action_or_ritual` surface variant | `surface_widening` | All ritual-capable spells with Action base casting time |

---

## No Dhall / JSON authored

The unit does not fit any honest encoding under the current surface. No `.dhall` or `.json` was written.
