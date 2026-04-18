Censer of Controlling Air Elementals does not fit the current magic-item surface honestly.

Why it fails:

- The item's core mechanic is a summoned controlled companion: "you can take a Magic action to summon an Air Elemental."
- The current surface can model that lifecycle only through `SpellMechanics.family = "spawned_creature"`.
- `MagicItemMechanics` and `MagicItemComponentMechanics` do not admit `spawned_creature`; they only allow `passive`, `activation`, `triggered_reaction`, or `composite` over those families.
- The activation family for non-spell units only carries `ActivationPhase`, and `EffectAtom` does not expose `create_companion` / `command_companion`, so there is no honest direct-phase fallback.

Why this is structural, not atom widening:

- The relevant v4 atoms already exist in the tracer taxonomy and implementation: `create_companion`, `command_companion`, `companion`, plus the associated control and dismissal structure under the spell `spawned_creature` family.
- The gap is that magic items cannot reach that existing companion payload family.

Minimal widening:

- Add a magic-item mechanics variant that can reuse the existing summoned-creature payload shape, either by:
  - widening `MagicItemComponentMechanics` to include a non-spell companion-summon family parallel to `spawned_creature`, or
  - extracting the current spell-only `spawned_creature` payload into a shared reusable family for spells and magic items.

Why the unit would fit after that:

- Activation cost is already expressible: `standard_action` with `action = "magic"`.
- Cooldown is already expressible: `resetCadence = { kind = "dawn" }`.
- Companion control is already expressible in the existing summon family: understands your languages, obeys commands, acts immediately after you.
- Dismissal timing is already expressible there: disappears after 1 hour, on death, or on bonus-action dismissal.

Evidence:

> "While gently swinging this censer, you can take a Magic action to summon an Air Elemental."

> "The elemental appears in an unoccupied space as close to the censer as possible, understands your languages, obeys your commands, and takes its turn immediately after you on your Initiative count."

> "The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action."

> "The censer can't be used this way again until the next dawn."
