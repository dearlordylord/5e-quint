# Level 1 Ralph Loop H - Special And Tail Selected Identities

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L1H-SPECIAL-PRECHECK",
      "status": "ready-for-research",
      "title": "Post-C Special And Tail Identity Reconciliation"
    },
    {
      "number": 2,
      "id": "L1H-ANIMAL-FRIENDSHIP",
      "status": "ready-for-implementation-after-light-research",
      "title": "Animal Friendship Selected Identity Replay"
    },
    {
      "number": 3,
      "id": "L1H-PROTECTION-EVIL-GOOD",
      "status": "ready-for-implementation-after-light-research",
      "title": "Protection From Evil And Good Selected Identity Replay"
    },
    {
      "number": 4,
      "id": "L1H-ELDRITCH-BLAST",
      "status": "ready-for-implementation-after-light-research",
      "title": "Eldritch Blast Selected Identity Replay"
    },
    {
      "number": 5,
      "id": "L1H-MAGE-ARMOR",
      "status": "ready-for-implementation-after-light-research",
      "title": "Mage Armor Selected Identity Replay"
    },
    {
      "number": 6,
      "id": "L1H-SANCTUARY",
      "status": "ready-for-implementation-after-light-research",
      "title": "Sanctuary Selected Identity Replay"
    },
    {
      "number": 7,
      "id": "L1H-MASS-CURE-WOUNDS",
      "status": "ready-for-implementation-after-light-research",
      "title": "Mass Cure Wounds Selected Identity Replay"
    },
    {
      "number": 8,
      "id": "L1H-MASS-HEALING-WORD",
      "status": "ready-for-implementation-after-light-research",
      "title": "Mass Healing Word Selected Identity Replay"
    },
    {
      "number": 9,
      "id": "L1H-FIGHTER-TACTICAL-MIND",
      "status": "ready-for-implementation-after-light-research",
      "title": "Fighter Tactical Mind Selected Identity Replay"
    },
    {
      "number": 10,
      "id": "L1H-BOON-COMBAT-PROWESS",
      "status": "ready-for-implementation-after-light-research",
      "title": "Boon Of Combat Prowess Selected Identity Replay"
    },
    {
      "number": 11,
      "id": "L1H-ORC-ADRENALINE-RUSH",
      "status": "ready-for-implementation-after-light-research",
      "title": "Orc Adrenaline Rush Selected Identity Replay"
    },
    {
      "number": 12,
      "id": "L1H-PALADIN-EXTRA-ATTACK",
      "status": "ready-for-implementation-after-light-research",
      "title": "Paladin Extra Attack Selected Identity Replay"
    },
    {
      "number": 13,
      "id": "L1H-RANGER-EXTRA-ATTACK",
      "status": "ready-for-implementation-after-light-research",
      "title": "Ranger Extra Attack Selected Identity Replay"
    }
  ]
}
-->

This loop owns selected-identity MBT expansion for strict level-1 special spell
Units plus the remaining supported-profile selected identity tail that is
already in the generated selected identity denominator. The tail tasks should
run only after strict level-1 special Units in this plan are complete or the
post-C precheck confirms they are still the best available frontier.

Do not edit `plans/ACTIVE_PLAN.md`.

## Authority

- `@dnd/battle-runtime` plus `packages/battle-runtime/battle-runtime.qnt` is the
  promoted battle authority.
- Use local RAW in `.references/srd-5.2.1/` and `UBIQUITOUS_LANGUAGE.md`.
- Do not add companion behavior. `find_familiar` stays out of scope.
- Do not turn table-owned facts such as creature type, target legality, or
  spatial reachability into duplicated runtime state unless the existing
  supported profile already owns that projection.

## Worktree Safety Prefix

Every Ralph prompt for this loop must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

## Review Loop

Use implementer, reviewer, handback until `accept`, then decider. Every task
must leave review and decider artifacts. Reviewers should reject broad behavior
work hidden inside selected identity evidence tasks.

## Owned Surface

Primary write scope:

- `packages/battle-runtime/src/*selected-identity*.mbt.test.ts` files for
  special spells and tail feature Units;
- matching qnt files when needed;
- `packages/character-sheet-runtime/src/*selected-identity*.mbt.test.ts` only
  for healing tail Units if that is the existing owner boundary;
- `plans/unit-profile-coverage/unit-evidence.jsonl`;
- generated coverage reports.

Avoid Loop D/E/F/G owner files except where the precheck explicitly records a
move.

## MBT And Verification Protocol

Use deterministic replay first. Full MBT is optional, serialized with
`flock /tmp/dnd-battle-mbt.lock`, and must use the timed wrapper from
`AGENTS.md`. If dependency links are missing, run `CI=true pnpm install` once
and do not commit `node_modules`.

Every task runs:

- relevant focused deterministic replay test;
- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- reviewer loop convergence, minimum two rounds.

## Task Details

### Task 1 - L1H-SPECIAL-PRECHECK - Post-C Special And Tail Identity Reconciliation

Status: `ready-for-research`

After Loop C lands, reconcile this loop against the refreshed strict report and
selected identity denominator. Keep strict level-1 special Units first. Tail
tasks for non-strict supported Units may remain runnable if the selected identity
metric still counts them and no stricter Unit was missed.

### Task 2 - L1H-ANIMAL-FRIENDSHIP - Animal Friendship Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `animal_friendship`, proving creature type
target admission and Charmed lifecycle within the existing supported runtime
boundary. Do not model social table behavior.

RAW: `.references/srd-5.2.1/Spells/Descriptions-A-D.md` Animal Friendship.

### Task 3 - L1H-PROTECTION-EVIL-GOOD - Protection From Evil And Good Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `protection_from_evil_and_good`, binding the
authored Unit through supported creature-type protection and charm boundary.

RAW: `.references/srd-5.2.1/Spells/Descriptions-M-P.md` Protection from Evil
and Good.

### Task 4 - L1H-ELDRITCH-BLAST - Eldritch Blast Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `eldritch_blast`, covering the supported
beam sequence and target allocation. Do not add invocation option behavior here.

RAW: `.references/srd-5.2.1/Spells/Descriptions-E-L.md` Eldritch Blast.

### Task 5 - L1H-MAGE-ARMOR - Mage Armor Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `mage_armor`, proving the supported Armor
Class base/projection behavior and duration cleanup without duplicating armor
equipment state.

RAW: `.references/srd-5.2.1/Spells/Descriptions-M-P.md` Mage Armor.

### Task 6 - L1H-SANCTUARY - Sanctuary Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `sanctuary`, covering ward creation, direct
targeting interdiction, Wisdom save outcome, replacement target boundary, and
ward-ending behavior already supported by runtime.

RAW: `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` Sanctuary.

### Task 7 - L1H-MASS-CURE-WOUNDS - Mass Cure Wounds Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `mass_cure_wounds` if it remains in the
supported selected identity denominator after the precheck. Keep this as a tail
task, not strict level-1 support.

RAW: `.references/srd-5.2.1/Spells/Descriptions-M-P.md` Mass Cure Wounds.

### Task 8 - L1H-MASS-HEALING-WORD - Mass Healing Word Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `mass_healing_word` if it remains in the
supported selected identity denominator after the precheck. Keep this as a tail
task, not strict level-1 support.

RAW: `.references/srd-5.2.1/Spells/Descriptions-M-P.md` Mass Healing Word.

### Task 9 - L1H-FIGHTER-TACTICAL-MIND - Fighter Tactical Mind Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `fighter_tactical_mind` if it remains in the
supported selected identity denominator after the precheck.

RAW: `.references/srd-5.2.1/Classes/Fighter.md` Tactical Mind.

### Task 10 - L1H-BOON-COMBAT-PROWESS - Boon Of Combat Prowess Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `feat_boon_of_combat_prowess` if it remains
in the supported selected identity denominator after the precheck.

RAW: `.references/srd-5.2.1/Feats.md` Boon of Combat Prowess.

### Task 11 - L1H-ORC-ADRENALINE-RUSH - Orc Adrenaline Rush Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `orc_adrenaline_rush` if it remains in the
supported selected identity denominator after the precheck.

RAW: `.references/srd-5.2.1/Character-Origins.md` Orc Adrenaline Rush.

### Task 12 - L1H-PALADIN-EXTRA-ATTACK - Paladin Extra Attack Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `paladin_extra_attack`, reusing the existing
extra-attack count scaling profile without conflating it with Fighter's Unit id.

RAW: `.references/srd-5.2.1/Classes/Paladin.md` Extra Attack.

### Task 13 - L1H-RANGER-EXTRA-ATTACK - Ranger Extra Attack Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `ranger_extra_attack`, reusing the existing
extra-attack count scaling profile without conflating it with Fighter or Paladin.

RAW: `.references/srd-5.2.1/Classes/Ranger.md` Extra Attack.
