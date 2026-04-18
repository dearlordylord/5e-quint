# Proposal: Word of Recall surface widenings

## Unit

**Word of Recall** — SRD 5.2.1, level 6 Conjuration spell  
Slug: `word_of_recall`  
Outcome: `surface_widening`

## Why the unit doesn't fit

Three related gaps prevent honest encoding. The first alone is disqualifying.

---

### Gap 1 — `teleport.destination` needs a new variant: `"designated_sanctuary"`

The existing `teleport` atom:

```typescript
| {
    readonly kind: "teleport";
    readonly maxFeet: number;
    readonly destination: "unoccupied_visible_space";
  }
```

Word of Recall's destination is a **previously designated sanctuary** — an anchor point registered by a prior cast of this same spell at a sacred location. It is not a "visible unoccupied space"; it is a named location stored in character state.

**Proposed addition** to `destination`:

```typescript
| "unoccupied_visible_space"
| "designated_sanctuary"   // new: target is the caster's pre-registered sanctuary
```

The `maxFeet` field becomes meaningless for this variant (the range is unlimited — it is a cross-planar or long-distance retrieval). A cleaner extension might make `maxFeet` optional or replace it with a `rangeConstraint` that admits `"unlimited"`.

---

### Gap 2 — Group teleport: caster + up to 5 companions simultaneously

RAW: "You and up to five willing creatures within 5 feet of you instantly teleport."

The surface models teleport on a per-attachment basis. `attachment: { kind: "self" }` covers only the caster. A second `target` phase covers companions but fires as a separate resolution step, not a simultaneous group move. For Word of Recall:

- All travelers depart and arrive together — the move is atomic.
- If the caster can't teleport (no sanctuary), **no one** teleports.
- A two-phase model (self → teleport, then target → teleport) loses the "no sanctuary = no effect for anyone" coupling.

**Proposed surface addition**: a combined self-plus-companions attachment variant, or a `group_teleport` effect atom that encodes "caster and choose_up_to N creatures within feet all move together."

One possible minimal encoding — extend `teleport` with an optional `companions` field:

```typescript
| {
    readonly kind: "teleport";
    readonly destination: TeleportDestination;
    readonly companions?: {
      readonly maxCount: number;
      readonly withinFeet: number;
      readonly requireWilling: true;
    };
  }
```

This keeps the single-atom model and makes the group semantics explicit.

---

### Gap 3 — Sanctuary designation: preparation meta-mechanic

RAW: "You must designate a location, such as a temple, as a sanctuary by casting this spell there."

The spell serves a dual role:

1. **Setup cast** (at a sacred location): registers that location as the caster's sanctuary. Effect persists indefinitely as character state.
2. **Retrieval cast** (anywhere): teleports the party to the registered sanctuary.

This is a **prior-cast preparation mechanic** with no surface representation. It differs from:

- `anchored_trigger` — that plants a trigger that fires on a future event. Here there is no trigger; the setup cast simply registers a destination.
- A separate spell — it is the same spell ID used in two modes.
- A `stored_spell` attachment — that stores a spell for later release. Here the "stored" thing is a location, not a spell.

**Proposed widening**: a `TeleportDestination` variant `"designated_sanctuary"` implicitly carries the dependency on prior setup (parallel to how `"unoccupied_visible_space"` implicitly requires line-of-sight). The surface records the destination type; the runtime tracks whether a sanctuary has been designated. No new atom is required beyond the destination variant, but a note in the unit's description field should capture the setup rule explicitly.

Alternatively, a `sanctuary_anchor` atom in the `lifecycle` or `resource` category could model the persistent registration as a first-class authored state.

---

## Minimal fix to unblock encoding

Only Gap 1 is strictly required for a typechecking JSON. With `destination: "designated_sanctuary"` added to the `teleport` atom union, the self-only encoding typechecks (silently dropping the 5 companions, which is honest to flag in notes). Gap 2 and Gap 3 require further surface investment.

Recommended order:
1. Widen `teleport.destination` to include `"designated_sanctuary"`.
2. Add optional `companions` field to `teleport` for the group-move semantic.
3. Document sanctuary designation as a runtime pre-condition in `notes`; defer a first-class atom unless another unit shares the pattern.
