# Proposal: surface widenings for Prestidigitation

## Unit

- Slug: `prestidigitation`
- Kind: `spell` (cantrip, level 0, transmutation)
- Outcome: `surface_widening`

## Why honest encoding is blocked

Prestidigitation is a cast-time-choice spell: each cast picks one of 6 named effect modes. The surface can represent this structure via `activation → direct → CastTimeEffectModeChoice`. Five of the six options are purely narrative (no mechanical atoms); these map cleanly to options with `effects` omitted as caller/DM-owned narrative — explicitly supported by the surface.

The sixth option (Minor Creation) partially fits `create_object` (trinket) or `create_illusion` (illusory image), but two surface gaps prevent an honest encoding.

---

## Gap 1 — Per-option duration in `CastTimeEffectModeChoice`

### Rule text

> Minor Creation: "It lasts until the end of your next turn."

The spell's header duration is `timed: 1 hour`. Minor Sensation and Magic Mark are also timed but last the full 1 hour. Minor Creation specifically expires at the end of the caster's next turn — a much shorter window.

### Current surface

`CastTimeEffectModeChoice.options[]` has this shape:

```typescript
readonly options: ReadonlyNonEmptyArray<{
  readonly id: string;
  readonly displayName: string;
  readonly effects?: ReadonlyNonEmptyArray<EffectAtom>;
}>;
```

There is no `duration` field on each option. The host spell's `duration` applies uniformly to all operations/effects; individual options cannot declare a shorter expiry.

Encoding `create_illusion` or `create_object` under the Minor Creation option without a per-option duration would make the tracer show a 1-hour lifecycle, which is factually wrong — the illusion/trinket lasts at most one full turn.

### Proposed widening

Add an optional `duration` field to `CastTimeEffectModeChoice` option entries:

```typescript
readonly options: ReadonlyNonEmptyArray<{
  readonly id: string;
  readonly displayName: string;
  readonly effects?: ReadonlyNonEmptyArray<EffectAtom>;
  readonly duration?: Duration;   // NEW: expires earlier than host spell's duration
}>;
```

Semantics: if present, the effects of this option expire when this duration elapses, even if the host spell is still active. Absent = governed by host spell's duration (existing behavior, unchanged).

This also addresses Alter Self's mid-duration switch (`allowsMidDurationSwitchAs: "magic_action"`) for future options where switching modes creates a new effect window over an existing one.

---

## Gap 2 — Multi-instance concurrent active cap

### Rule text

> "If you cast this spell multiple times, you can have up to three of its non-instantaneous effects active at a time."

Each cast of Prestidigitation is a separate activation. Non-instantaneous effects (Minor Sensation, Magic Mark, Minor Creation) from prior casts remain active alongside the new one. The cap of 3 simultaneous non-instantaneous instances is enforced across casts, not within a single cast.

### Current surface

No field on `ActivationMechanics`, `SpellMechanics`, or `OngoingEffectMechanics` expresses a per-spell-identity concurrent-instance limit. The surface tracks single-cast lifecycle; multi-cast stacking is outside its scope.

### Proposed widening

Add an optional `maxConcurrentInstances` field (or `maxConcurrentNonInstantaneousInstances`) to the relevant mechanics header:

```typescript
type SpellMechanicsHeader = {
  ...
  readonly maxConcurrentInstances?: {
    readonly count: number;
    readonly scope: "non_instantaneous";  // closed: only value in SRD so far
  };
};
```

Semantics: if the caster activates a new instance that would exceed this cap, the oldest qualifying instance ends. The tracer would emit a lifecycle node (e.g., `replace_on_recast` extended for the N-instance case).

---

## Gap 3 (minor) — Nested choice within Minor Creation

Minor Creation offers "a nonmagical trinket or an illusory image" — a use-time fork between `create_object` and `create_illusion`. The surface `CastTimeEffectModeChoice` explicitly supports only shallow options (no nested choice-of-choice). Even after Gap 1 is resolved, this fork would need either:

- A second level of `CastTimeEffectModeChoice` nesting (not supported), or
- Both atoms listed as `effects` with `create_object` and `create_illusion` in parallel (ambiguous — not how parallel effects work), or
- A new `CastTimeChoice<EffectAtom>` concept within an option's effects list.

This is a narrower pressure (single unit, single option) and could be deferred by representing Minor Creation as narrative-only until nested choices are supported.

---

## Encoding path once gaps are resolved

```
spell_root → activate → direct_apply [phase 1]
  → choose (6 options):
      Sensory Effect     → (narrative, no mechanical payload)
      Fire Play          → (narrative, no mechanical payload)
      Clean or Soil      → (narrative, no mechanical payload)
      Minor Sensation    → (narrative, no mechanical payload, duration: 1h)
      Magic Mark         → (narrative, no mechanical payload, duration: 1h)
      Minor Creation     → create_object | create_illusion, duration: end_of_next_turn
```

The `maxConcurrentInstances: { count: 3, scope: "non_instantaneous" }` header field would emit a `replace_on_recast` (extended) lifecycle node.
