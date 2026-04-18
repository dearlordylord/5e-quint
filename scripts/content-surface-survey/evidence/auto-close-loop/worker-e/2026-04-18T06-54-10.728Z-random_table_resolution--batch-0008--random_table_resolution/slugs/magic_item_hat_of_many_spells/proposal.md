# Hat of Many Spells

`Hat of Many Spells` does not fit the current authored surface honestly, so I did not author `content/magic_item_hat_of_many_spells.dhall`.

The top-level `magic_item` kind is not the problem. The item is structurally close to `MagicItemRecord` with `composite` mechanics:

- a passive held-item property for the spellcasting-focus clause
- an activated property for `Unknown Spell`

The blocking issue is payload expressiveness.

## Blocking gaps

- `grant_spellcasting_focus` is missing.
  The passive property is a deterministic casting capability, not flavor text:
  `"While holding the hat, you can use it as a Spellcasting Focus for your Wizard spells."`

- `grant_spell_access` is too narrow for `Unknown Spell`.
  The hat does not grant one named spell. It lets the wielder choose any eligible Wizard-list spell they do not know, spend a matching spell slot, and cast it with that spell's own casting time.
  Current surface only supports fixed `spellId` grants and fixed activation costs.

- The cooldown is conditional on success.
  Current activation resources/reset cadence are spent on activation, not only after a successful branch:
  `"On a successful check ... you can't use this property again until you finish a Short or Long Rest."`

- The failure table requires effects the current surface cannot express cleanly.
  The biggest hard blockers are:
  - mundane object creation (`"You pull a nonmagical object out of the hat."`)
  - uncontrolled creature spawning with timed disappearance

## Why this is `atom_widening`

At least one required concept is not present as a current authored atom: spellcasting-focus capability. The random-table object branch also pressures `create_object`, which exists in v4 taxonomy but is not exposed in the current surface/tracer yet.

That makes the honest verdict broader than a simple top-level family mismatch. The family is close; the atoms and subgraph support are not.

## Additional pressure not modeled here

Later table results would also need more surface support for:

- a temporary two-way portal to another plane
- GM-chosen magic-item generation with timed disappearance
- random spell execution from a spell table rather than a fixed `spellId`

Any attempted placeholder encoding would misrepresent the item's core mechanic, so I stopped at the widening report.
