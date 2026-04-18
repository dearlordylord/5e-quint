## Cloak of Arachnida

Outcome: `surface_widening`

The unit fits the existing `magic_item` kind and `composite` mechanics family:

- passive grants cover `Poison Resistance`
- passive grants cover `Spider Climb` as `grant_speed { speedKind = "climb", feet = walk_speed }`
- an activated part covers the once-per-dawn `Web` cast with fixed DC 13

Two real surface gaps remain.

### 1. Missing worn-item gate on magic-item mechanics

RAW text:

> "While wearing it, you gain the following benefits."

Current magic-item mechanics can require attunement, and `PassiveMechanics` can carry some equipment predicates, but there is no generic worn-item predicate for cloaks, rings, boots, and similar items.

Needed widening:

- add an equipment predicate variant such as `wearing_item`

Why this is surface, not structural:

- the item is still a normal passive / activated magic item
- no new top-level family is needed
- the missing piece is a narrower gate on when existing grants apply

### 2. Missing granted-spell parameter override for enlarged area

RAW text:

> "You can cast Web (save DC 13). The web created by the spell fills twice its normal area."

Current `grant_spell_access` already supports:

- fixed DC override
- target restriction

It does not support overriding the granted spell's printed mechanics, here specifically the area size.

Needed widening:

- add a granted-spell override field for mechanical parameter overrides, or a narrower area-override variant sufficient for "twice its normal area"

Why this is surface, not atom:

- `Web` already exists and its atoms already exist
- the missing piece is how this item mutates the granted spell's authored payload

### Omitted secondary rider

RAW text:

> "You can't be caught in webs of any sort and can move through webs as if they were Difficult Terrain."

This was left unencoded. In the current package, web-terrain / web-geometry handling is already treated as caller-owned for `Web` itself, so I did not force a fake atom here.
