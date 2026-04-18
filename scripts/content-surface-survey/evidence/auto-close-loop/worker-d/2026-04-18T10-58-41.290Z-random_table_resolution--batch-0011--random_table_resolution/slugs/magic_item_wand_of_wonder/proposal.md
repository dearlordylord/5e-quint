`Wand of Wonder` is a `magic_item`, but it is not an honest fit for the current authored surface.

Why it stops here:

- The top-level item shell exists: rare magic item, attunement, `charge_pool`, dawn recharge, last-charge destruction, held-item gate, Magic action cost.
- The failure is the payload. The item's core mechanic is a `random_table` whose outcomes are not one homogeneous family:
  - some outcomes immediately cast existing spells with per-cast overrides (`Darkness`, `Faerie Fire`, `Fireball`, `Slow`, `Stinking Cloud`, `Gust of Wind`, `Lightning Bolt`, `Invisibility`, `Polymorph`, `Enlarge/Reduce`);
  - some outcomes apply non-spell timed riders (`Stunned until the start of your next turn`, `Blinded for 1 minute` with repeat save);
  - some outcomes create timed environmental areas (`heavy rain`, `butterflies`, `grass`);
  - one outcome creates an uncontrolled creature for 1 hour;
  - one outcome targets an object and exiles it to the Ethereal Plane.

The current `ActivationPhase.random_table` can only branch into more `ActivationPhase[]`. That is enough for attack/save/direct subprocedures, but not for a branch that needs its own spell header, duration model, summon payload, or object-target attachment. Encoding this as `grant_spell_access` would be false: the wand does not grant the user a reusable casting mode, it resolves one random effect immediately.

Required widening:

1. `new_subgraph`: `random_outcome_payload`
   - Justification: a single random-table result must be able to release a heterogeneous payload, not just another flat activation-phase sequence. The branch needs to host either a referenced spell cast, a local timed effect package, or a summon/object effect with its own lifecycle.
   - Evidence: "That location becomes the point of origin of a spell or other magical effect determined by rolling on the Wand of Wonder Effects table."

2. `new_variant`: `RandomTableOutcome.spell_cast`
   - Justification: several rows are immediate one-shot casts of existing spells from the chosen point, with fixed save DC 15 and range/origin overrides. `grant_spell_access` is persistent access, not immediate release.
   - Evidence: "You cast a spell originating from the chosen point." / "You cast Gust of Wind." / "You cast Lightning Bolt." / "You cast Invisibility on yourself."

3. `new_variant`: branch-local lifecycle on random outcomes
   - Justification: different rows have different durations and repeat-save structures, but `magic_item` activation has only one optional top-level `duration`, not per-branch lifecycle.
   - Evidence: "you have the Stunned condition until the start of your next turn" / "Heavy rain falls for 1 minute" / "The butterflies remain for 10 minutes" / "the leaves turn brown and fall off after 24 hours."

4. `new_variant`: uncontrolled summoned creature payload
   - Justification: current spawned-creature surfaces assume a controllable companion payload (`command_companion`). This branch explicitly creates a creature that is not under your control and acts normally.
   - Evidence: "The creature isn't under your control, acts as it normally would, and disappears after 1 hour or when it drops to 0 Hit Points."

5. `new_variant`: object attachment / object exile targeting in activation phases
   - Justification: the surface `Attachment` grammar used by activation phases has no object-target form, but one row selects an unattended object and moves it to the Ethereal Plane.
   - Evidence: "An object of the GM's choice disappears into the Ethereal Plane. The object must be neither worn nor carried..."

Secondary DM/caller-owned residue:

- "If an effect has multiple possible subjects, the GM determines randomly which among them are affected." This is a target-selection policy not currently surfaced.
- Obscuration and overgrown-grass presentation are caller/environment owned in the same way other authored area-visibility notes have been deferred elsewhere in the corpus.

Because the table is the item's core mechanic, omitting these rows would be misleading. No `content/magic_item_wand_of_wonder.dhall` was authored.
