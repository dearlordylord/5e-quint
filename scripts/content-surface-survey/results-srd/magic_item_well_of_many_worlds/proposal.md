## Well of Many Worlds

Outcome: `atom_widening`

### Why it does not fit cleanly

`Well of Many Worlds` is a `magic_item`, and its top-level kind does exist. It also superficially looks like an activated magic item because opening it uses a Magic action.

The problem is that the current surface cannot honestly encode the item's actual deterministic behavior:

- It creates a persistent **two-way portal** in the world.
- That portal stays open until a later **Magic action** closes it.
- Reuse is blocked by a **random elapsed-time cooldown** of `1d8 hours`.

If I forced this into the current activation family, the trace would lie about the mechanic. `teleport` is a one-shot movement effect, not a created portal. `anchored_trigger` is also wrong: the item does not plant a trigger and later release a stored effect. The portal itself is the durable game object.

### Missing surface / atom support

1. `portal_creation_and_lifecycle` subgraph

Needed to represent:

- opening a portal on a surface;
- the portal as a persistent traversable object/attachment in play;
- explicit later closure by a nearby creature taking a Magic action;
- two-way travel through that portal while open.

Why existing atoms are insufficient:

- `teleport` moves a creature once; it does not leave a portal behind.
- `block_travel` is the opposite semantic direction.
- `location` / `area` attachments exist, but there is no effect/procedure/lifecycle shape for **creating and maintaining a portal**.

Evidence:

> "it forms a two-way, 6-foot-diameter, circular portal to another world or plane of existence"

> "The portal remains open until a creature within 5 feet of it takes a Magic action to close it"

2. Timed random cooldown reset for activated items

Needed to represent:

- one use that becomes available again after a random non-rest duration.

Why existing resource reset shapes are insufficient:

- `short_rest`, `long_rest`, `short_or_long_rest`, `dawn`, and `never` do not cover `1d8 hours`.
- This is not item destruction and not a charge-pool recharge-at-dawn pattern.

Evidence:

> "Once the Well of Many Worlds has opened a portal, it can't do so again for 1d8 hours."

### DM-agenda boundary

The destination is explicitly GM-decided:

> "Each time the item opens a portal, the GM decides where it leads."

That part is caller-owned / DM agenda. But the item is **not** overall `dm_agenda`, because creating and maintaining an open portal is still a deterministic core mechanic that the surface should be able to express.
