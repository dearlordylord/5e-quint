# Authored execution identity audit

This audit blocks the final Effect 4 milestone at revision
`bb03daff98938b993661e7b9ad19481f0572cd5f`. It is a design and inventory
checkpoint, not a runtime implementation.

The decisive finding is that authored spell names remain executable procedure,
active-effect, subject, command, hole, fill, checkpoint, registry-key, and error
message identities. The current checker rejects direct dispatch through
`spell.id`, `spell.name`, and provenance, but it does not reject an authored
name that has already been copied into a new runtime discriminator. The
machine-readable cohort is
[`authored-execution-identity-cohort.json`](authored-execution-identity-cohort.json).

## Canonical architecture

Surface authored records remain the sole owners of spell id, name, provenance,
and protected expression. Admission parses the record once into generic
procedure facts. Execution carries only procedure/effect occurrence refs and
generic mechanics. Presentation joins an occurrence ref back to retained
authored identity when a user-facing label is required.

Static mechanics have one canonical owner: the procedure binding addressed by
`sourceProcedureRef`. A durable active effect stores only dynamic lifecycle
state that cannot be derived from that binding: `effectRef`, source refs,
area/manifestation occurrence identity, activation anchor, per-turn usage
ledger, and expiration state. Reducers must not copy save, damage, range,
radius, movement, passive-area, or early-end facts beside the procedure binding.

Persistent area execution is one generic save/effect family projected from
existing Surface operations. Its lifecycle is an exhaustive union rather than
optional booleans:

- `stationary`
- `sourceTurnTranslation { distanceFeet, direction, movedAreaOperation,
environmentalEnd }`
- `casterActionReposition { actionCost, maxDistanceFeet,
movedAreaOperation, collisionDisposition }`

Cloudkill, Insect Plague, Flaming Sphere, and Moonbeam are instantiations of the
save-damage family. Grease, Sleet Storm, and Web use the parallel generic
save-effect family. Exact replay retains source turn, ordered occurrence
sequence, completed prefix, duration cohort, effect ref, and target; only the
authored-name-bound checkpoint and hole kinds change.

## Surface corrections

No new movement or usage-limit schema is needed. `move_area`,
`on_caster_turn_start`, `on_area_moves_into_creature_space`, and
`UsageLimit.limitGroup` already exist.

- Cloudkill must encode caster-turn-start 10-foot movement away from the
  caster, the moved-area save trigger, and one once-per-turn group shared by
  appearance, moved-area, entry, and end-turn saves.
- Insect Plague must use one once-per-turn group shared by appearance, entry,
  and end-turn saves.
- Grease currently models only its appearance save and approximates its
  two-dimensional ground square as a cube. It needs durable terrain and
  recurring trigger facts plus a ground-footprint shape.
- Find Familiar still lacks typed touch-spell proxy, exact recall-placement,
  and recast form-change facts. Execution must not recover those facts from its
  name.
- Sleep still lacks its non-sleeper/Exhaustion-immunity predicate and
  nearby-creature shake-awake action.
- Thaumaturgy still lacks a typed selected mode and the three-active,
  one-minute-effect limit.

These are fail-closed admission changes. A record missing a required operation
is unsupported; execution never supplies the missing fact.

## RAW evidence

A bounded `rg -uu` heading search was run over `.references/srd-5.2.1`, then
the matching local passages were inspected directly. The procedure cohort is
anchored at:

- `Spells/Descriptions-A-D.md`: Antimagic Field 208, Blur 595, Cloudkill 788,
  Command 820, Counterspell 1187, Dancing Lights 1292, Dragon's Breath 1695.
- `Spells/Descriptions-E-L.md`: Expeditious Retreat 168, Feather Fall 283,
  Flaming Sphere 516, Fog Cloud 584, Grease 886, Gust of Wind 1007, Haste 1091,
  Hideous Laughter 1215, Hypnotic Pattern 1292, Insect Plague 1432, Jump 1496,
  Levitate 1560.
- `Spells/Descriptions-M-P.md`: Magic Weapon 117, Mirror Image 375, Moonbeam 445.
- `Spells/Descriptions-S-Z.md`: Sanctuary 22, Shield 215, Sleep 337, Sleet
  Storm 352, Slow 367, Spike Growth 480, Spiritual Weapon 512, Thaumaturgy 848,
  Warding Bond 1219, Web 1262.

Additional named effect/message owners were checked against their exact local
headings: Calm Emotions, Chromatic Orb, Darkness, Darkvision, Dispel Magic,
Dissonant Whispers, Entangle, Faerie Fire, Find Familiar, Fireball, Fly, Heal,
Hellish Rebuke, Ice Knife, Light, Magic Missile, Protection from Evil and Good,
Resistance, See Invisibility, Shatter, Shining Smite, Sorcerous Burst,
Thunderwave, and Water Breathing.

## QNT and MBT disposition

Reusable semantics move to generic QNT cores named after the procedure family.
Spell-named QNT files may remain only as SRD fixture instantiations, proof roots,
or MBT adapters; they cannot be registered as the semantic core. The
rules-kernel obligation, profile obligation, owner-role, generator-readiness,
and hole-frontier registries must point at the generic owner. Existing named
MBT tests remain valuable parity fixtures after their drivers switch to generic
runtime subjects.

Highest-risk consolidations are persistent-area trigger timing and exact replay;
compelled next-turn behavior and movement; magic-suppression transit and
interdiction; spatial attack-proxy cast/repeat; staged and repeated saves; and
linked damage sharing. Those cores must preserve their current invariants rather
than replacing the work with file renames.

## Enforcement design

Extend `check:authored-id-dispatch` with an AST cohort gate:

1. Load spell ids and names from Surface JSON and derive snake, camel, Pascal,
   and normalized tokens.
2. Determine the battle execution closure from the existing import-ownership
   entry points. Exclude tests, QNT fixture modules, Surface catalog/content,
   procedure admission, and act presentation. There is no execution allowlist.
3. Reject an authored token in values assigned to `procedure`, `kind`,
   `command`, `tag`, action/protocol kinds, schema literals for those fields,
   canonical registry/interface keys, hole/fill/checkpoint kinds, and exact
   authored-title text in execution messages or labels.
4. Treat short generic rules-word collisions (`Light`, `Fly`, `Heal`, `Harm`,
   `Knock`, `Resistance`) by syntactic role: imported canonical mechanics are
   permitted, but a local execution discriminator, registry key, or authored
   title message is not. This prevents both false positives and identity
   laundering.
5. Self-tests must cover direct literals, schema literals, map/interface keys,
   arrays later used for dispatch, messages, transformed spell names, a
   synthetic near miss, admission/presentation exclusions, and a newly added
   Surface record whose transformed name collides with a production key.

The passing condition is zero authored-record-name intersections in production
execution discriminants, keys, protocol identities, or messages. Stale,
duplicate, or allowlisted execution findings fail.

## Sequencing and ownership

The integrator first lands generic core procedure/effect/protocol types and the
red enforcement gate. Three disjoint workers then own spatial, control/lifecycle,
and attack/reaction/emitter feature files and their focused QNT/MBT evidence.
They do not edit shared union, codec, registry, dispatch, report, or checker
files; those remain integrator-owned. After the lanes converge, the integrator
updates shared dispatch and generated coverage registries, runs focused tests,
then performs the two required review rounds before the public milestone.

The exact ownership patterns are in the JSON inventory. If a file matches an
integrator pattern, that ownership wins; workers must report the needed shared
change instead of editing the file.
