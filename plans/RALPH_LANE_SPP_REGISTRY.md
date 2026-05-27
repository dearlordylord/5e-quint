# Ralph Lane SPP — Spell Procedure Profile Registry

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "SPP-W1-01-WIDEN-RESOLVE-INPUT",
      "status": "done",
      "title": "Widen SpellProcedureProfileResolveInput for bonus-action and reaction inputs"
    },
    {
      "number": 2,
      "id": "SPP-W2-01-MAKE-STABLE",
      "status": "done",
      "title": "Migrate makeStable profile (cantrip template)"
    },
    {
      "number": 3,
      "id": "SPP-W2-02-HELD-LIGHT",
      "status": "done",
      "title": "Migrate heldLight profile (cantrip template)"
    },
    {
      "number": 4,
      "id": "SPP-W2-03-OBJECT-LIGHT",
      "status": "done",
      "title": "Migrate objectLight profile (cantrip template)"
    },
    {
      "number": 5,
      "id": "SPP-W2-04-THAUMATURGY-BOOMING-VOICE",
      "status": "done",
      "title": "Migrate thaumaturgyBoomingVoice profile (cantrip template)"
    },
    {
      "number": 6,
      "id": "SPP-W2-05-BLUR-ATTACK-ROLL-DEFENSE",
      "status": "done",
      "title": "Migrate blurAttackRollDefense profile (prepared template)"
    },
    {
      "number": 7,
      "id": "SPP-W2-06-SEE-INVISIBLE-OBSERVER-SIGHT",
      "status": "done",
      "title": "Migrate seeInvisibleObserverSight profile (prepared template)"
    },
    {
      "number": 8,
      "id": "SPP-W2-07-PERSISTENT-ARMOR-EFFECT",
      "status": "done",
      "title": "Migrate persistentArmorEffect profile (prepared template)"
    },
    {
      "number": 9,
      "id": "SPP-W2-08-MAGIC-WEAPON-ENHANCEMENT",
      "status": "done",
      "title": "Migrate magicWeaponEnhancement profile"
    },
    {
      "number": 10,
      "id": "SPP-W2-09-WARDING-BOND",
      "status": "done",
      "title": "Migrate wardingBond profile"
    },
    {
      "number": 11,
      "id": "SPP-W2-10-CREATURE-TYPE-PROTECTION",
      "status": "done",
      "title": "Migrate creatureTypeProtection profile"
    },
    {
      "number": 12,
      "id": "SPP-W2-11-CONDITION-REMOVAL-PROTECTION",
      "status": "done",
      "title": "Migrate conditionRemovalProtection profile"
    },
    {
      "number": 13,
      "id": "SPP-W2-12-DIRECT-CONDITION-REMOVAL",
      "status": "done",
      "title": "Migrate directConditionRemoval profile (no focused MBT)"
    },
    {
      "number": 14,
      "id": "SPP-W2-13-COND-IMMUNITY-TURN-START-THP",
      "status": "done",
      "title": "Migrate conditionImmunityAndTurnStartTemporaryHitPoints (no focused MBT)"
    },
    {
      "number": 15,
      "id": "SPP-W2-14-CREATURE-SIZE-CHANGE",
      "status": "done",
      "title": "Migrate creatureSizeIncrease/Decrease combined profile"
    },
    {
      "number": 16,
      "id": "SPP-W2-15-LEVITATED-CREATURE",
      "status": "done",
      "title": "Migrate levitatedCreature profile"
    },
    {
      "number": 17,
      "id": "SPP-W2-16-SCALAR-BUFF",
      "status": "done",
      "title": "Migrate scalarBuff profile (multi-shape)"
    },
    {
      "number": 18,
      "id": "SPP-W3-01-DIRECT-HP-RESTORATION",
      "status": "done",
      "title": "Migrate directHitPointRestoration profile (bonus-action)"
    },
    {
      "number": 19,
      "id": "SPP-W3-02-EXPEDITIOUS-RETREAT-DASH",
      "status": "done",
      "title": "Migrate expeditiousRetreatDash profile (bonus-action, no focused MBT)"
    },
    {
      "number": 20,
      "id": "SPP-W3-03-JUMP-MOVEMENT-REPLACEMENT",
      "status": "done",
      "title": "Migrate jumpMovementReplacement profile (bonus-action)"
    },
    {
      "number": 21,
      "id": "SPP-W3-04-FEATHER-FALL-MITIGATION",
      "status": "done",
      "title": "Migrate featherFallMitigation profile (reaction-trigger)"
    },
    {
      "number": 22,
      "id": "SPP-W3-05-SELF-TELEPORT",
      "status": "done",
      "title": "Migrate selfTeleport profile (bonus-action)"
    },
    {
      "number": 23,
      "id": "SPP-W3-06-SELF-TRANSFORMATION-MODE",
      "status": "done",
      "title": "Migrate selfTransformationMode profile"
    },
    {
      "number": 24,
      "id": "SPP-W3-07-DRAGONS-BREATH-INITIAL",
      "status": "done",
      "title": "Migrate dragonsBreathInitial profile"
    },
    {
      "number": 25,
      "id": "SPP-W3-08-SANCTUARY-TARGETING-INTERDICTION",
      "status": "ready-for-research",
      "title": "Migrate sanctuaryTargetingInterdiction profile"
    },
    {
      "number": 26,
      "id": "SPP-W3-09-MARKED-DAMAGE-RIDER",
      "status": "ready-for-research",
      "title": "Migrate markedDamageRider profile (no focused MBT)"
    },
    {
      "number": 27,
      "id": "SPP-W3-10-WEAPON-DAMAGE-RIDER",
      "status": "ready-for-research",
      "title": "Migrate weaponDamageRider profile (no focused MBT)"
    },
    {
      "number": 28,
      "id": "SPP-W3-11-WEAPON-ATTACK-OVERRIDE",
      "status": "ready-for-research",
      "title": "Migrate weaponAttackOverride profile (no focused MBT)"
    },
    {
      "number": 29,
      "id": "SPP-W3-12-SPELL-HOSTED-WEAPON-ATTACK",
      "status": "ready-for-research",
      "title": "Migrate spellHostedWeaponAttack profile"
    },
    {
      "number": 30,
      "id": "SPP-W4-01-DIRECT-CONDITION",
      "status": "ready-for-research",
      "title": "Migrate directCondition profile"
    },
    {
      "number": 31,
      "id": "SPP-W4-02-SAVE-GATED-DAMAGE",
      "status": "ready-for-research",
      "title": "Migrate saveGatedDamage profile (anchor of save-gated family)"
    },
    {
      "number": 32,
      "id": "SPP-W4-03-SAVE-GATED-CONDITION",
      "status": "ready-for-research",
      "title": "Migrate saveGatedCondition profile"
    },
    {
      "number": 33,
      "id": "SPP-W4-04-SAVE-GATED-CONDITION-IMMUNITY",
      "status": "ready-for-research",
      "title": "Migrate saveGatedConditionImmunity profile"
    },
    {
      "number": 34,
      "id": "SPP-W4-05-SAVE-GATED-ATTACK-ROLL-ADVANTAGE",
      "status": "ready-for-research",
      "title": "Migrate saveGatedAttackRollAdvantage profile"
    },
    {
      "number": 35,
      "id": "SPP-W4-06-ABILITY-D20-ROLL-MODE-SAVE-GATE",
      "status": "ready-for-research",
      "title": "Migrate abilityD20TestRollModeSaveGate profile"
    },
    {
      "number": 36,
      "id": "SPP-W4-07-SLEEP-TARGET-ADMISSION",
      "status": "ready-for-research",
      "title": "Migrate sleepTargetAdmission profile"
    },
    {
      "number": 37,
      "id": "SPP-W4-08-HIDEOUS-LAUGHTER",
      "status": "ready-for-research",
      "title": "Migrate hideousLaughter profile (no focused MBT — uses integration)"
    },
    {
      "number": 38,
      "id": "SPP-W4-09-GREASE-GROUND-HAZARD",
      "status": "ready-for-research",
      "title": "Migrate greaseGroundHazard profile"
    },
    {
      "number": 39,
      "id": "SPP-W4-10-COMMAND",
      "status": "ready-for-research",
      "title": "Migrate command profile"
    },
    {
      "number": 40,
      "id": "SPP-W4-11-SAVE-GATED-HELPERS-SWEEP",
      "status": "ready-for-research",
      "title": "After save-gated family migrates: relocate shared helpers and trim spells-profiles-save-gates.ts"
    },
    {
      "number": 41,
      "id": "SPP-W5-01-COUNTERSPELL",
      "status": "ready-for-research",
      "title": "Migrate counterspell reaction profile (requires SPP-W1-01)"
    },
    {
      "number": 42,
      "id": "SPP-W5-02-SHIELD-REACTION",
      "status": "ready-for-research",
      "title": "Migrate shieldReaction reaction profile"
    },
    {
      "number": 43,
      "id": "SPP-W6-01-SPELL-ATTACK-DAMAGE",
      "status": "ready-for-research",
      "title": "Migrate spellAttackDamage profile (anchor of attack family)"
    },
    {
      "number": 44,
      "id": "SPP-W6-02-SPELL-ATTACK-SEQUENCE",
      "status": "ready-for-research",
      "title": "Migrate spellAttackSequence profile"
    },
    {
      "number": 45,
      "id": "SPP-W6-03-CHAINED-SPELL-ATTACK-DAMAGE",
      "status": "ready-for-research",
      "title": "Migrate chainedSpellAttackDamage profile"
    },
    {
      "number": 46,
      "id": "SPP-W6-04-ATTACK-BURST-SAVE-DAMAGE",
      "status": "ready-for-research",
      "title": "Migrate attackBurstSaveDamage profile"
    },
    {
      "number": 47,
      "id": "SPP-W6-05-REPEATED-DAMAGE-ALLOCATION",
      "status": "ready-for-research",
      "title": "Migrate repeatedDamageAllocation profile"
    },
    {
      "number": 48,
      "id": "SPP-W6-06-HELD-LIGHT-HURL",
      "status": "ready-for-research",
      "title": "Migrate heldLightHurl profile (paired with heldLight)"
    },
    {
      "number": 49,
      "id": "SPP-W7-01-AFTER-HIT-DAMAGE",
      "status": "ready-for-research",
      "title": "Migrate afterHitDamage rider profile (no focused MBT)"
    },
    {
      "number": 50,
      "id": "SPP-W7-02-AFTER-HIT-DAMAGE-AND-ILLUMINATION",
      "status": "ready-for-research",
      "title": "Migrate afterHitDamageAndIllumination (Shining Smite)"
    },
    {
      "number": 51,
      "id": "SPP-W7-03-AFTER-HIT-SAVE-GATED-CONDITION",
      "status": "ready-for-research",
      "title": "Migrate afterHitSaveGatedCondition (no focused MBT)"
    },
    {
      "number": 52,
      "id": "SPP-W7-04-AFTER-HIT-TIMED-DAMAGE-AND-SAVE",
      "status": "ready-for-research",
      "title": "Migrate afterHitTimedDamageAndSave (no focused MBT)"
    },
    {
      "number": 53,
      "id": "SPP-W8-01-SPELL-CREATED-HELD-OBJECT-FAMILY",
      "status": "ready-for-research",
      "title": "Migrate spellCreatedHeldObject + Attack + ReEvoke (one file)"
    },
    {
      "number": 54,
      "id": "SPP-W8-02-SPIRITUAL-WEAPON-FAMILY",
      "status": "ready-for-research",
      "title": "Migrate spiritualWeaponAttackProxy + spiritualWeaponRepeatAttack (one file)"
    },
    {
      "number": 55,
      "id": "SPP-W8-03-OBJECT-CONTACT-DAMAGE-FAMILY",
      "status": "ready-for-research",
      "title": "Migrate objectContactDamage + objectContactDamageRepeat (one file)"
    },
    {
      "number": 56,
      "id": "SPP-W8-04-DANCING-LIGHTS-FAMILY",
      "status": "ready-for-research",
      "title": "Migrate dancingLightsCombinedCast + Reposition + SeparateCast (one file)"
    },
    {
      "number": 57,
      "id": "SPP-W8-05-MIRROR-IMAGE-HIT-INTERCEPTION",
      "status": "ready-for-research",
      "title": "Migrate mirrorImageHitInterception profile"
    },
    {
      "number": 58,
      "id": "SPP-W8-06-FLAMING-SPHERE",
      "status": "ready-for-research",
      "title": "Migrate flamingSphere lifecycle profile"
    },
    {
      "number": 59,
      "id": "SPP-W8-07-MOONBEAM",
      "status": "ready-for-research",
      "title": "Migrate moonbeam movable-zone profile"
    },
    {
      "number": 60,
      "id": "SPP-W8-08-FOG-CLOUD-OBSCUREMENT",
      "status": "ready-for-research",
      "title": "Migrate fogCloudObscurement profile"
    },
    {
      "number": 61,
      "id": "SPP-W8-09-GUST-OF-WIND-LINE",
      "status": "ready-for-research",
      "title": "Migrate gustOfWindLine profile"
    },
    {
      "number": 62,
      "id": "SPP-W8-10-SPIKE-GROWTH-MOVEMENT-HAZARD",
      "status": "ready-for-research",
      "title": "Migrate spikeGrowthMovementHazard profile"
    },
    {
      "number": 63,
      "id": "SPP-W8-11-WEB-RESTRAINT-HAZARD",
      "status": "ready-for-research",
      "title": "Migrate webRestraintHazard profile"
    },
    {
      "number": 64,
      "id": "SPP-W8-12-MAGICAL-DARKNESS-POINT-ORIGIN",
      "status": "ready-for-research",
      "title": "Migrate magicalDarknessPointOrigin profile"
    },
    {
      "number": 65,
      "id": "SPP-W8-13-ANTIMAGIC-FIELD-ONGOING-SPELL-SUPPRESSION",
      "status": "ready-for-research",
      "title": "Migrate antimagicFieldOngoingSpellSuppression profile"
    },
    {
      "number": 66,
      "id": "SPP-W8-14-ONGOING-SPELL-END",
      "status": "ready-for-research",
      "title": "Migrate ongoingSpellEnd profile"
    },
    {
      "number": 67,
      "id": "SPP-W9-01-EXPORT-CODEC-BUILDING-BLOCKS",
      "status": "blocked",
      "title": "Export shared invocation Schema building-blocks from battle-codecs.ts"
    },
    {
      "number": 68,
      "id": "SPP-W9-02-ADD-INVOCATION-SCHEMA-FIELD",
      "status": "blocked",
      "title": "Add invocationSchema field to SpellProcedureProfile"
    },
    {
      "number": 69,
      "id": "SPP-W9-03-MIGRATE-CODEC-BRANCHES",
      "status": "blocked",
      "title": "Move per-profile Schema branches into each profile file"
    },
    {
      "number": 70,
      "id": "SPP-W9-04-DERIVE-METAMAGIC-TABLE",
      "status": "blocked",
      "title": "Derive metamagic compatibility table from registry; delete the hand-maintained one"
    },
    {
      "number": 71,
      "id": "SPP-W9-05-INVERT-TARGET-LIST-PREDICATE",
      "status": "blocked",
      "title": "Invert isTargetListSpellInvocation to iterate registry"
    },
    {
      "number": 72,
      "id": "SPP-W9-06-INVERT-READIED-SPELL-LIST",
      "status": "blocked",
      "title": "Invert readiedSpellAct procedure list to iterate registry"
    },
    {
      "number": 73,
      "id": "SPP-W9-07-INVERT-WILLING-TARGET-LISTS",
      "status": "blocked",
      "title": "Invert KNOWN_WILLING_TARGET_* consultations to iterate registry"
    },
    {
      "number": 74,
      "id": "SPP-W9-08-INVERT-FILL-SET-NEGATIVE-LISTS",
      "status": "blocked",
      "title": "Invert spells-resolve-fill-set.ts negative lists"
    },
    {
      "number": 75,
      "id": "SPP-W9-09-CONSOLIDATE-RESOLVE-DISPATCH",
      "status": "blocked",
      "title": "Replace spells-resolve.ts procedure switch with registry iteration"
    },
    {
      "number": 76,
      "id": "SPP-W9-10-CONSOLIDATE-DISCOVERY-DISPATCH",
      "status": "blocked",
      "title": "Replace spells-discovery.ts procedure switch (cast act + summary) with registry iteration"
    },
    {
      "number": 77,
      "id": "SPP-W9-11-CONSOLIDATE-INVOCATION-REF",
      "status": "blocked",
      "title": "Replace spells-invocation-ref.ts Match cascade with registry iteration"
    },
    {
      "number": 78,
      "id": "SPP-W10-01-FULL-SUITE-PARITY-RUN",
      "status": "blocked",
      "title": "Run full MBT suite; confirm parity preserved end-to-end"
    },
    {
      "number": 79,
      "id": "SPP-W10-02-DELETE-DEAD-DISPATCH",
      "status": "blocked",
      "title": "Delete now-empty spells-resolve-support-effects.ts and other dispatch shells"
    },
    {
      "number": 80,
      "id": "SPP-W10-03-DOCS-AND-ADR",
      "status": "blocked",
      "title": "Add ADR documenting the registry; update README; close lane"
    }
  ]
}
-->

## Mission

Migrate the remaining ~67 Spell Procedure Profiles into the registry shape
established by `damage-reduction.ts` and `roll-modifier.ts` on commits
`46dd7f8ab` and `286a5e098`. After the per-profile sweep, do the
cross-cutting cleanups (codec, metamagic, classification negative lists)
and the final dispatch consolidation. Then delete the now-empty shells.

The unit of work is **one profile per task**, one commit. The shape and
template are fixed; per-task variation is purely "which procedure" and
"which focused MBT verifies it." Most tasks follow the
[Per-Profile Migration Template](#per-profile-migration-template) below
without modification.

## Context Budget

Read these before any task:

- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/README.md`
- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/profile.ts`
- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts`
- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/damage-reduction.ts` (simple template)
- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/roll-modifier.ts` (multi-shape template, has the documented cast pattern)
- `CLAUDE.md` (project rules; MBT protocol; connascence discipline; parse-don't-validate)
- This file's [Per-Profile Migration Template](#per-profile-migration-template)

Per task, additionally read only the target profile's touchpoints (use the
grep recipe in the template).

## Lane Rules

- **One profile per commit.** Do not batch profiles. The commit message
  references the procedure name and the focused MBT that verifies it.
- **No behavior changes.** Pure relocation. If the MBT changes meaning,
  stop — the migration is wrong.
- **Worktree must prime `.quint-cache`.** First action in any new worktree:
  `cp -r /workspace/typescript/dnd/.quint-cache <worktree>/` (see CLAUDE.md
  "Fresh worktree battle MBT module resolution").
- **Type discipline.** The profile interface is the contract. Implementations
  must use `SpellAdmissionContext` for the admit `ctx`, even if they only
  read one field. Match the `damage-reduction.ts` / `roll-modifier.ts`
  patterns.
- **Cast discipline.** Only use the `as RollModifierInvocation`-style cast
  when discriminated narrowing fails for a union-shape reason. Document
  why at the cast site, matching `roll-modifier.ts`'s comment block.
- **Shared helper movement is opt-in.** If a helper is used only by the
  profile being migrated, move it into the profile file. If it is shared
  with another profile or with infrastructure, leave it where it is and
  import it back. Note remaining shared touchpoints in the profile file's
  header comment.
- **Don't touch cross-cutting infrastructure mid-migration.** The codec,
  metamagic table, negative-list classification, and dispatch switches are
  Wave 9 work, not per-profile work. Per-profile tasks only delegate to
  the profile via the existing `procedure === "..."` branches.
- **One MBT at a time.** Per CLAUDE.md: kill zombies before starting,
  wrap with the timing shell, use `run_in_background`.
- **Slow seed?** Re-run without `QUINT_SEED` for a fresh one. Do not
  narrow domain ranges to make tests faster.
- **MBT-less profiles get integration coverage.** Profiles marked "no
  focused MBT" in the per-task entry fall back to
  `battle-runtime.mbt.test.ts` as the verification gate. Flag in the
  commit message and request a focused test as a separate follow-up.

## Verification (every task)

1. `cd packages/battle-runtime && pnpm typecheck` — must be clean.
2. `cd packages/battle-runtime && pnpm exec tsc --noEmit --noUnusedLocals` — catches dead imports the deletion left behind.
3. Focused MBT for the migrated profile (per-task table value). Wrap:
   `START=$(date +%s); MBT_TRACES=1 MBT_STEPS=6 pnpm exec vitest run src/<test>.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` with `run_in_background: true`.
4. Branch ancestor check (CLAUDE.md): `git merge-base --is-ancestor <Base SHA> HEAD` must succeed. If not, stop and report.
5. Commit message must include: procedure name, focused MBT name + duration, what moved, what stayed (and why).

## Per-Profile Migration Template

Use this for every task in Waves 2–8. The variation per profile is the
procedure name, the touchpoint file list, and the focused MBT.

### Step 1 — Touchpoint inventory

```sh
grep -rn '"<procedure>"' packages/battle-runtime/src --include='*.ts' \
  | grep -v '.test.ts' | grep -v 'spell-procedure-profiles'
```

Expect ~7–15 hits per profile across:

- `spells-profiles*.ts` (admit predicate + projection helpers)
- `spells-resolve-support-effects.ts` (resolver function)
- `spells-active-effects.ts` (applyEffect function)
- `spells-resolve.ts` (procedure dispatch branch)
- `spells-discovery.ts` (cast-act branch + summary branch)
- `spells-invocation-ref.ts` (Match case)
- `spells-targeting.ts` (if known-willing-target list applies)
- `spells-invocation-guards.ts` (classification membership — LEAVE for Wave 9)
- `spells-resolve-fill-set.ts` (fill-set membership — LEAVE for Wave 9)
- `battle-codecs.ts` (Schema branch — LEAVE for Wave 9)
- `metamagic.ts` (compatibility entry — LEAVE for Wave 9; mirror on profile)

### Step 2 — Create the profile file

Path: `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/<procedure-kebab-case>.ts`.

Skeleton (copy from `damage-reduction.ts` for single-shape cantrip-only,
or from `roll-modifier.ts` for multi-shape / multi-access):

```ts
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-<kebab-procedure>
//
// The <procedure> Spell Procedure Profile: <one-line domain description>.
//
// What lives here: admit, discoverCastAct, castSummary, invocationRef,
// resolve, applyEffect helpers (file-local).
//
// What stays in shared infrastructure (imported back): <list helpers>.

import type { SpellRecord } from "@dnd/surface/surface/types";
// ...battle-reducer imports, identity, helpers...
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

type <Procedure>Invocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "<procedure>" }
>;

function admit<Procedure>(spell, ctx): readonly <Procedure>Invocation[] { ... }
function discover<Procedure>CastAct(state, actorId, invocation): readonly AvailableBattleAct[] { ... }
function <procedure>InvocationRef(invocation): SpellInvocationRef { ... }
function <procedure>CastSummary(invocation): string { ... }
function resolve<Procedure>(input): BattleResolutionResult { ... }
function apply<Procedure>Effect(state, ...): BattleState { ... }

export const <procedure>Profile: SpellProcedureProfile<
  "<procedure>",
  <Procedure>Invocation
> = {
  procedure: "<procedure>",
  metamagicCompatibility: "<copy from metamagic.ts>",
  isTargetListInvocation: <copy from isTargetListSpellInvocation>,
  isReadiedSpellCompatible: <copy from readiedSpellAct list membership>,
  knownWillingTargetSpellIds: <constant or [] >,
  admit: admit<Procedure>,
  discoverCastAct: discover<Procedure>CastAct,
  castSummary: <procedure>CastSummary,
  invocationRef: <procedure>InvocationRef,
  resolve: resolve<Procedure>,
};
```

### Step 3 — Move code, don't rewrite

Move the resolver, applyEffect, admit predicates, discovery branch,
castSummary branch, invocationRef Match case **byte-for-byte** into the
profile file, renaming the public names if needed for cohesion. If you
inline an admit predicate (preferred), the projection helper it called
stays in its original file unless it's profile-private; the admit body
calls it back via import.

### Step 4 — Register

Edit `registry.ts`:

```ts
import { <procedure>Profile } from "./<procedure-kebab-case>.ts";

export const REGISTERED_SPELL_PROCEDURE_PROFILES = [
  damageReductionProfile,
  rollModifierProfile,
  <procedure>Profile,
] as const satisfies ReadonlyArray<AnySpellProcedureProfile>;
```

### Step 5 — Delegate at old sites

Replace each touchpoint with a call into the profile. Patterns:

- `spells-resolve.ts`: `return resolveXSpellAct({...})` → `return <procedure>Profile.resolve({...})`
- `spells-profiles.ts`: `supportedXProfile(...)` → `<procedure>Profile.admit(spell, { actorId, spellcasting, characterLevel })`
- `spells-discovery.ts` cast-act branch: replace body with `return <procedure>Profile.discoverCastAct(state, actorId, invocation)`
- `spells-discovery.ts` summary branch: `return <procedure>Profile.castSummary(invocation)`
- `spells-invocation-ref.ts` Match case: `(inv) => <procedure>Profile.invocationRef(inv)`

### Step 6 — Delete the moved functions from their origin files

If the function had multiple importers other than the profile, leave them
unaffected (those importers are the "shared helper" case). Otherwise
delete.

### Step 7 — Verify

Per [Verification](#verification-every-task) above.

### Step 8 — Commit

Per [Lane Rules](#lane-rules) above. One profile, one commit, descriptive
message that names the procedure and the focused MBT used.

## Failure modes and recovery

- **MBT fails on a seed.** First re-run without `QUINT_SEED` (CLAUDE.md
  says ~49% slow-seed rate on the invariant fuzzer). If it fails on
  multiple seeds, the migration is wrong — read the trace from the seed
  the failure reports, write a focused TS unit test that replays the
  failing event sequence against the package reducer, and fix the
  divergence.
- **Typecheck reports a variance error on the registry array.** The
  existential type in `profile.ts:AnySpellProcedureProfile` uses a
  distributive union over the procedure literal. If you change the
  profile type's parametrisation, preserve the distributive shape — see
  the comment block.
- **Type assertion needed in a buildInvocation helper.** Use the
  documented `as <Procedure>Invocation` pattern from `roll-modifier.ts`
  if and only if the union is shape-discriminated (no single tag field).
  Add the same explanatory comment.
- **A helper looks shared but actually isn't.** Use
  `grep -rn '<helperName>' packages/battle-runtime/src --include='*.ts'`
  to confirm callers before moving. If a single non-profile importer
  remains, leave the helper in place.
- **Fresh worktree fails with QNT404.** Per CLAUDE.md: missing
  `.quint-cache`. Copy from the main checkout.
- **Branch base mismatch.** `git merge-base --is-ancestor <base> HEAD`
  fails. Stop. The Ralph runner owns branch repair; do not rebase
  against master from a task agent.

## Tasks

### Wave 0 — Foundation (done, do not redo)

Commits already on `deepen/spell-procedure-profile-registry`:

- `46dd7f8ab` — scaffolding + damageReduction migrated
- `286a5e098` — rollModifier migrated
- `483569c23` — reviewer-loop fixes (`SpellAdmissionContext` consistency, cast comment)
- `092eb9720` — move profile docs out of UBIQUITOUS_LANGUAGE.md into the directory README

### Wave 1 — Generalize the resolve input

Before any non-action-time profile (Wave 3 bonus-action and Wave 5
reaction profiles) can migrate, the profile interface needs to admit a
wider `input` type than `ActionSpellBattleResolutionInput`.

### Task 1 - SPP-W1-01-WIDEN-RESOLVE-INPUT - Widen SpellProcedureProfileResolveInput

Status: `ready-for-research`
Depends on: none
Blocks: SPP-W3-*, SPP-W5-*

Input: `profile.ts:SpellProcedureProfileResolveInput`; the existing
`ActionSpellBattleResolutionInput`, `BonusActionSpellBattleResolutionInput`,
and reaction-time input types in `battle-reducer.ts`.

Output: `SpellProcedureProfileResolveInput<I>` parameterised over the
input type as well, so a bonus-action profile can declare
`resolve: (input: SpellProcedureProfileResolveInput<I, BonusActionSpellBattleResolutionInput>) => ...`.
damage-reduction and roll-modifier continue to use the
ActionSpellBattleResolutionInput defaulted form.

Acceptance: typecheck clean, both existing profiles still satisfy
`AnySpellProcedureProfile`, focused MBTs for both still pass.

### Wave 2 — Single-shape profiles (damage-reduction template, action-time)

Each task: follow the template. Replace `<MBT>` with the focused test
name; for entries marked "no focused MBT", verification falls back to
`battle-runtime.mbt.test.ts` (integration).

### Task 2 - SPP-W2-01-MAKE-STABLE - Migrate makeStable profile

Status: `done` until SPP-W1-01 lands (optional dependency — makeStable
is cantrip-action-time and could go without W1, but ordering avoids
churn).
Focused MBT: `healing-stabilization-selected-identity.mbt.test.ts`.

### Task 3 - SPP-W2-02-HELD-LIGHT - Migrate heldLight profile

Status: `done`.
Focused MBT: `level1-spatial-witness-selected-identity.mbt.test.ts`.

### Task 4 - SPP-W2-03-OBJECT-LIGHT - Migrate objectLight profile

Status: `done`.
Focused MBT: `level2-protection-spell-selected-identity.mbt.test.ts` or
`level1-spatial-witness-selected-identity.mbt.test.ts` (both cover it).

### Task 5 - SPP-W2-04-THAUMATURGY-BOOMING-VOICE - Migrate thaumaturgyBoomingVoice

Status: `done`.
Focused MBT: `thaumaturgy-selected-identity.mbt.test.ts`. Note:
`rollModifierSkillFilter` is shared with this profile (already documented
in `roll-modifier.ts`). After migration, the shared helper remains in
`spells-profiles-support.ts`.

### Task 6 - SPP-W2-05-BLUR-ATTACK-ROLL-DEFENSE - Migrate blurAttackRollDefense

Status: `done`.
Focused MBT: `blur-attack-roll-defense-lifecycle.mbt.test.ts`.

### Task 7 - SPP-W2-06-SEE-INVISIBLE-OBSERVER-SIGHT - Migrate seeInvisibleObserverSight

Status: `done`.
Focused MBT: `see-invisibility-observer-sight.mbt.test.ts` (verify
exists — likely the test file lacks the keyword grep but exists by name).

### Task 8 - SPP-W2-07-PERSISTENT-ARMOR-EFFECT - Migrate persistentArmorEffect

Status: `done`.
Focused MBT: `mage-armor-selected-identity.mbt.test.ts`.

### Task 9 - SPP-W2-08-MAGIC-WEAPON-ENHANCEMENT - Migrate magicWeaponEnhancement

Status: `done`.
Focused MBT: `level2-protection-spell-selected-identity.mbt.test.ts`.

### Task 10 - SPP-W2-09-WARDING-BOND - Migrate wardingBond

Status: `done`.

Focused MBT: `warding-bond-damage-sharing.mbt.test.ts`.

### Task 11 - SPP-W2-10-CREATURE-TYPE-PROTECTION - Migrate creatureTypeProtection

Status: `done`

Focused MBT: `creature-type-protection-and-charm-selected-identity.mbt.test.ts`.

### Task 12 - SPP-W2-11-CONDITION-REMOVAL-PROTECTION - Migrate conditionRemovalProtection

Status: `done`

Focused MBT: `condition-removal-protection-selected-identity.mbt.test.ts`.

### Task 13 - SPP-W2-12-DIRECT-CONDITION-REMOVAL - Migrate directConditionRemoval

Status: `done`

No focused MBT. Same as above.

### Task 14 - SPP-W2-13-COND-IMMUNITY-TURN-START-THP - Migrate conditionImmunityAndTurnStartTemporaryHitPoints

Status: `done`

No focused MBT. Same as above. This profile has a complex
`activeEffects` shape (two elements); follow the template, file-local
applyEffect needs to write both.

### Task 15 - SPP-W2-14-CREATURE-SIZE-CHANGE - Migrate creatureSizeIncrease/Decrease combined

Status: `done`

Single profile, two procedure literals. The invocation type is
`{procedure: "creatureSizeIncrease" | "creatureSizeDecrease"}`. The
profile registers under one of the two; the resolve dispatches both.
Verify the existential type still admits this.
Focused MBT: `creature-size-change-lifecycle.mbt.test.ts`.

### Task 16 - SPP-W2-15-LEVITATED-CREATURE - Migrate levitatedCreature

Status: `done`

Focused MBT: `levitated-creature-lifecycle.mbt.test.ts`.

### Task 17 - SPP-W2-16-SCALAR-BUFF - Migrate scalarBuff

Status: `done`

Multi-shape (target-list or self targeting, several effect kinds). Use
`roll-modifier.ts` as template. Focused MBT:
`level2-mobility-spell-selected-identity.mbt.test.ts`.

### Wave 3 — Bonus-action and bonus-time profiles (require Wave 1)

Each task depends on SPP-W1-01.

### Task 18 - SPP-W3-01-DIRECT-HP-RESTORATION - Migrate directHitPointRestoration

Status: `done`

Focused MBT: `quickened-spell-governor.mbt.test.ts` (covers
directHitPointRestoration via Healing Word). May also need scope from
`rule-core-spells.mbt.test.ts`.

### Task 19 - SPP-W3-02-EXPEDITIOUS-RETREAT-DASH - Migrate expeditiousRetreatDash

Status: `done`

No focused MBT. Falls back to integration.

### Task 20 - SPP-W3-03-JUMP-MOVEMENT-REPLACEMENT - Migrate jumpMovementReplacement

Status: `done`

Focused MBT: `level1-spatial-witness-selected-identity.mbt.test.ts`.

### Task 21 - SPP-W3-04-FEATHER-FALL-MITIGATION - Migrate featherFallMitigation

Status: `done`

Reaction-triggered (Featherfall is a Reaction spell). Treat as a Wave 3
case (uses bonus-action-time machinery via the trigger). Focused MBT:
`level1-spatial-witness-selected-identity.mbt.test.ts`.

### Task 22 - SPP-W3-05-SELF-TELEPORT - Migrate selfTeleport

Status: `done`

Focused MBT: `self-teleport-lifecycle.mbt.test.ts`.

### Task 23 - SPP-W3-06-SELF-TRANSFORMATION-MODE - Migrate selfTransformationMode

Status: `done`

Focused MBT: `self-transformation-mode-lifecycle.mbt.test.ts`.

### Task 24 - SPP-W3-07-DRAGONS-BREATH-INITIAL - Migrate dragonsBreathInitial

Status: `done`

Focused MBT: `dragons-breath-initial-effect.mbt.test.ts`.

### Task 25 - SPP-W3-08-SANCTUARY-TARGETING-INTERDICTION - Migrate sanctuaryTargetingInterdiction

Status: `ready-for-research`

Focused MBT: `sanctuary-selected-identity.mbt.test.ts`.

### Task 26 - SPP-W3-09-MARKED-DAMAGE-RIDER - Migrate markedDamageRider

Status: `ready-for-research`

No focused MBT. Falls back to integration.

### Task 27 - SPP-W3-10-WEAPON-DAMAGE-RIDER - Migrate weaponDamageRider

Status: `ready-for-research`

No focused MBT. Falls back to integration. Note: weaponDamageRider is
similar in shape to afterHitDamage; the migration of both together can
trigger a shared-helper extraction follow-up.

### Task 28 - SPP-W3-11-WEAPON-ATTACK-OVERRIDE - Migrate weaponAttackOverride

Status: `ready-for-research`

No focused MBT. Falls back to integration.

### Task 29 - SPP-W3-12-SPELL-HOSTED-WEAPON-ATTACK - Migrate spellHostedWeaponAttack

Status: `ready-for-research`

Focused MBT: `level1-buff-mark-smite-selected-identity.mbt.test.ts`.

### Wave 4 — Save-gated family (shared helpers move together)

Tasks 30–39 share the projection / fill-set helpers in
`spells-profiles-save-gates.ts`. Each profile task moves its specific
admit + resolve + applyEffect; SPP-W4-11 then sweeps the shared helpers
into a `save-gate-helpers.ts` shared module.

### Task 30 - SPP-W4-01-DIRECT-CONDITION - Migrate directCondition

Status: `ready-for-research`

Focused MBT: `direct-condition-lifecycle.mbt.test.ts`.

### Task 31 - SPP-W4-02-SAVE-GATED-DAMAGE - Migrate saveGatedDamage

Status: `ready-for-research`

Anchor of family. Focused MBT:
`level2-damage-spell-selected-identity.mbt.test.ts`.

### Task 32 - SPP-W4-03-SAVE-GATED-CONDITION - Migrate saveGatedCondition

Status: `ready-for-research`

Focused MBT: `level2-control-spell-selected-identity.mbt.test.ts`.

### Task 33 - SPP-W4-04-SAVE-GATED-CONDITION-IMMUNITY - Migrate saveGatedConditionImmunity

Status: `ready-for-research`

Focused MBT: `level2-control-spell-selected-identity.mbt.test.ts`.

### Task 34 - SPP-W4-05-SAVE-GATED-ATTACK-ROLL-ADVANTAGE - Migrate saveGatedAttackRollAdvantage

Status: `ready-for-research`

Focused MBT: `level1-spatial-witness-selected-identity.mbt.test.ts`.

### Task 35 - SPP-W4-06-ABILITY-D20-ROLL-MODE-SAVE-GATE - Migrate abilityD20TestRollModeSaveGate

Status: `ready-for-research`

No focused MBT. Falls back to integration.

### Task 36 - SPP-W4-07-SLEEP-TARGET-ADMISSION - Migrate sleepTargetAdmission

Status: `ready-for-research`

Focused MBT: `battle-runtime.mbt.test.ts` (integration only).

### Task 37 - SPP-W4-08-HIDEOUS-LAUGHTER - Migrate hideousLaughter

Status: `ready-for-research`

No focused MBT. Falls back to integration.

### Task 38 - SPP-W4-09-GREASE-GROUND-HAZARD - Migrate greaseGroundHazard

Status: `ready-for-research`

Focused MBT: `level1-spatial-witness-selected-identity.mbt.test.ts`.

### Task 39 - SPP-W4-10-COMMAND - Migrate command

Status: `ready-for-research`

Focused MBT: `rule-core-ability-skill-command.mbt.test.ts` and
`movement-forced-movement-selected-identity.mbt.test.ts`.

### Task 40 - SPP-W4-11-SAVE-GATED-HELPERS-SWEEP - Relocate save-gate shared helpers

Status: `blocked` on Tasks 30–39 all complete.

Input: `spells-profiles-save-gates.ts` after the per-profile migrations.

Output: a new `spell-procedure-profiles/_save-gate-helpers.ts` (underscore
prefix to signal "shared by profiles, not a profile itself") containing
the helpers all save-gated profiles still import. Old file deleted if
empty.

Acceptance: typecheck clean, save-gated profile MBTs still pass.

### Wave 5 — Reaction profiles (require Wave 1)

### Task 41 - SPP-W5-01-COUNTERSPELL - Migrate counterspell

Status: `ready-for-research`

Focused MBT: `reaction-spell-selected-identity.mbt.test.ts` and
`reaction-casting-time.mbt.test.ts`. The profile.resolve uses the
reaction-time resolve input.

### Task 42 - SPP-W5-02-SHIELD-REACTION - Migrate shieldReaction

Status: `ready-for-research`

Focused MBT: `reaction-spell-selected-identity.mbt.test.ts`.

### Wave 6 — Attack-spell family

### Task 43 - SPP-W6-01-SPELL-ATTACK-DAMAGE - Migrate spellAttackDamage

Status: `ready-for-research`

Anchor. Focused MBT:
`level1-damage-spell-selected-identity.mbt.test.ts`. Also covered by
`rule-core-spells.mbt.test.ts` and `feature-selected-identity.mbt.test.ts`.

### Task 44 - SPP-W6-02-SPELL-ATTACK-SEQUENCE - Migrate spellAttackSequence

Status: `ready-for-research`

Focused MBT: `level2-damage-spell-selected-identity.mbt.test.ts`.

### Task 45 - SPP-W6-03-CHAINED-SPELL-ATTACK-DAMAGE - Migrate chainedSpellAttackDamage

Status: `ready-for-research`

Focused MBT: `chained-attack-sequence.mbt.test.ts`.

### Task 46 - SPP-W6-04-ATTACK-BURST-SAVE-DAMAGE - Migrate attackBurstSaveDamage

Status: `ready-for-research`

Focused MBT: `level1-damage-spell-selected-identity.mbt.test.ts`.

### Task 47 - SPP-W6-05-REPEATED-DAMAGE-ALLOCATION - Migrate repeatedDamageAllocation

Status: `ready-for-research`

Focused MBT: `reaction-spell-selected-identity.mbt.test.ts` and
`reaction-casting-time.mbt.test.ts`. Note: this is a continuation-style
procedure; the resolver wraps an inner spell-attack flow.

### Task 48 - SPP-W6-06-HELD-LIGHT-HURL - Migrate heldLightHurl

Status: `ready-for-research`

Focused MBT: `level1-spatial-witness-selected-identity.mbt.test.ts`.
Paired with heldLight; the projection helper may be shared.

### Wave 7 — After-hit rider family

All four are no-focused-MBT or thin focused coverage. Verification falls
back to `battle-runtime.mbt.test.ts` plus authored unit tests.

### Task 49 - SPP-W7-01-AFTER-HIT-DAMAGE - Migrate afterHitDamage

Status: `ready-for-research`

No focused MBT. Falls back to integration.

### Task 50 - SPP-W7-02-AFTER-HIT-DAMAGE-AND-ILLUMINATION - Migrate afterHitDamageAndIllumination

Status: `ready-for-research`

Focused MBT: `shining-smite-selected-identity.mbt.test.ts`.

### Task 51 - SPP-W7-03-AFTER-HIT-SAVE-GATED-CONDITION - Migrate afterHitSaveGatedCondition

Status: `ready-for-research`

No focused MBT. Falls back to integration.

### Task 52 - SPP-W7-04-AFTER-HIT-TIMED-DAMAGE-AND-SAVE - Migrate afterHitTimedDamageAndSave

Status: `ready-for-research`

No focused MBT. Falls back to integration.

### Wave 8 — Multi-variant and lifecycle profiles

Each task migrates one PROFILE FAMILY (multiple closely-related procedure
literals that share state) into ONE file.

### Task 53 - SPP-W8-01-SPELL-CREATED-HELD-OBJECT-FAMILY - Migrate spellCreatedHeldObject + Attack + ReEvoke

Status: `ready-for-research`

Three procedure literals, one shared lifecycle. Focused MBT:
`spell-created-held-object-lifecycle.mbt.test.ts`. The profile file
registers three procedures from one module; the registry's existential
type accepts this because each registration is its own narrow profile
instance — but verify with typecheck.

### Task 54 - SPP-W8-02-SPIRITUAL-WEAPON-FAMILY - Migrate spiritualWeaponAttackProxy + spiritualWeaponRepeatAttack

Status: `ready-for-research`

Focused MBT: `battle-runtime.mbt.test.ts` and
`level2-damage-spell-selected-identity.mbt.test.ts`.

### Task 55 - SPP-W8-03-OBJECT-CONTACT-DAMAGE-FAMILY - Migrate objectContactDamage + objectContactDamageRepeat

Status: `ready-for-research`

Focused MBT: `level2-damage-spell-selected-identity.mbt.test.ts` and
`heat-metal-object-contact.mbt.test.ts`.

### Task 56 - SPP-W8-04-DANCING-LIGHTS-FAMILY - Migrate dancingLightsCombinedCast + Reposition + SeparateCast

Status: `ready-for-research`

Focused MBT: `level1-spatial-witness-selected-identity.mbt.test.ts`.

### Task 57 - SPP-W8-05-MIRROR-IMAGE-HIT-INTERCEPTION - Migrate mirrorImageHitInterception

Status: `ready-for-research`

Focused MBT: `mirror-image-hit-interception.mbt.test.ts`.

### Task 58 - SPP-W8-06-FLAMING-SPHERE - Migrate flamingSphere

Status: `ready-for-research`

Focused MBT: `flaming-sphere-hazard-ram.mbt.test.ts`.

### Task 59 - SPP-W8-07-MOONBEAM - Migrate moonbeam

Status: `ready-for-research`

Focused MBT: `moonbeam-movable-zone.mbt.test.ts`.

### Task 60 - SPP-W8-08-FOG-CLOUD-OBSCUREMENT - Migrate fogCloudObscurement

Status: `ready-for-research`

Focused MBT: `level1-spatial-witness-selected-identity.mbt.test.ts`.

### Task 61 - SPP-W8-09-GUST-OF-WIND-LINE - Migrate gustOfWindLine

Status: `ready-for-research`

Focused MBT: `gust-of-wind-line-lifecycle.mbt.test.ts`.

### Task 62 - SPP-W8-10-SPIKE-GROWTH-MOVEMENT-HAZARD - Migrate spikeGrowthMovementHazard

Status: `ready-for-research`

Focused MBT: `spike-growth-movement-hazard.mbt.test.ts`.

### Task 63 - SPP-W8-11-WEB-RESTRAINT-HAZARD - Migrate webRestraintHazard

Status: `ready-for-research`

Focused MBT: `web-restraint-hazard.mbt.test.ts`.

### Task 64 - SPP-W8-12-MAGICAL-DARKNESS-POINT-ORIGIN - Migrate magicalDarknessPointOrigin

Status: `ready-for-research`

Focused MBT: `magical-darkness-point-origin-lifecycle.mbt.test.ts`.

### Task 65 - SPP-W8-13-ANTIMAGIC-FIELD-ONGOING-SPELL-SUPPRESSION - Migrate antimagicFieldOngoingSpellSuppression

Status: `ready-for-research`

Focused MBT: `antimagic-field-ongoing-suppression.mbt.test.ts`. Note:
this procedure touches the `antimagic-field-suppression.ts` module
which several other profiles consult. Leave that module alone; only the
admit/resolve/applyEffect specific to this procedure move.

### Task 66 - SPP-W8-14-ONGOING-SPELL-END - Migrate ongoingSpellEnd

Status: `ready-for-research`

Focused MBT: `dispel-magic-selected-identity.mbt.test.ts` and
`dispel-magic-ongoing-spell-ending.mbt.test.ts`.

### Wave 9 — Cross-cutting cleanup

Now that all profiles are registered, the residual scattered
infrastructure can iterate the registry instead of carrying parallel
data. Each task should run the full focused MBT subset that was
exercised by the per-profile tasks (parallel runs of the seven
selected-identity MBTs is reasonable here).

### Task 67 - SPP-W9-01-EXPORT-CODEC-BUILDING-BLOCKS - Export Schema building-blocks from battle-codecs.ts

Status: `done` on all per-profile tasks complete.

Input: `battle-codecs.ts:602` (`ClassCantripSpellAccessSchema`),
`battle-codecs.ts:620` (`NoSpellInvocationResourceSchema`),
`SpellSlotInvocationResourceSchema`, `BattleRuntimeObjectSchema`,
`MovementFeet`, `DamageTypeSchema`. Plus whatever other repeated atomic
schemas the per-profile Schema branches use.

Output: those schemas are `export`-ed (or moved to a sibling
`codec-building-blocks.ts`). No call-site changes yet.

Acceptance: typecheck clean. No behavior change.

### Task 68 - SPP-W9-02-ADD-INVOCATION-SCHEMA-FIELD - Add invocationSchema field to SpellProcedureProfile

Status: `blocked` on Task 67.

Input: `profile.ts`. The TODO at the bottom of the interface declaration.

Output: `SpellProcedureProfile` gains `invocationSchema: Schema.Schema<I>`.
Existing profiles get a placeholder schema (or the actual one moved from
battle-codecs.ts in this task) so the type still compiles.

Acceptance: typecheck clean. damage-reduction and roll-modifier carry
their own schema.

### Task 69 - SPP-W9-03-MIGRATE-CODEC-BRANCHES - Move per-profile Schema branches into each profile file

Status: `blocked` on Task 68.

Input: `battle-codecs.ts` Schema union (~50 branches at the time of
plan).

Output: each branch moves into the corresponding profile file as the
`invocationSchema` field. The central codec becomes:
```ts
const SupportedSpellInvocationSchema = Schema.Union(
  ...REGISTERED_SPELL_PROCEDURE_PROFILES.map((p) => p.invocationSchema)
);
```
Battle-codecs.ts shrinks dramatically.

Acceptance: typecheck clean. Snapshot codec parity holds (run the full
MBT subset — at least the 5 selected-identity tests).

### Task 70 - SPP-W9-04-DERIVE-METAMAGIC-TABLE - Derive metamagic compatibility table from registry

Status: `blocked` on all per-profile tasks complete.

Input: `metamagic.ts` METAMAGIC_COMPATIBILITY table.

Output: the table is derived from
`REGISTERED_SPELL_PROCEDURE_PROFILES.map((p) => [p.procedure, p.metamagicCompatibility])`.
The hand-maintained table deletes.

Acceptance: typecheck clean. `quickened-spell-governor.mbt.test.ts` passes
(it exercises the metamagic dispatch).

### Task 71 - SPP-W9-05-INVERT-TARGET-LIST-PREDICATE - Invert isTargetListSpellInvocation

Status: `blocked`

Input: `spells-invocation-guards.ts:51` (`isTargetListSpellInvocation`)
— the 26-clause OR-chain.

Output:
```ts
export function isTargetListSpellInvocation(inv): inv is TargetListSpellInvocation {
  const profile = registeredSpellProcedureProfile(inv.procedure);
  return profile?.isTargetListInvocation ?? <fallback-for-unmigrated>;
}
```
Since all profiles are migrated by now, the fallback is `false` (or an
exhaustive throw on an unrecognised procedure).

Acceptance: typecheck clean. Same full MBT subset as task 69.

### Task 72 - SPP-W9-06-INVERT-READIED-SPELL-LIST - Invert readiedSpellAct list

Status: `blocked`

Same pattern as Task 71 for the
`readiedSpellAct` procedure list in `spells-discovery.ts:1880`.

### Task 73 - SPP-W9-07-INVERT-WILLING-TARGET-LISTS - Invert KNOWN_WILLING_TARGET_* consultations

Status: `blocked`

Input: `spells-targeting.ts:1065,1069` consultations of
`KNOWN_WILLING_TARGET_DAMAGE_REDUCTION_SPELL_IDS` and
`KNOWN_WILLING_TARGET_ROLL_MODIFIER_SPELL_IDS`.

Output: replace with
`registeredSpellProcedureProfile(inv.procedure)?.knownWillingTargetSpellIds.includes(inv.spell.id)`.
Delete the hand-maintained constants if no other consumers.

### Task 74 - SPP-W9-08-INVERT-FILL-SET-NEGATIVE-LISTS - Invert spells-resolve-fill-set.ts negative lists

Status: `blocked`

Input: `spells-resolve-fill-set.ts:787, 959, 971, 988, 1213` — the
negative-list `invocation.procedure !== "X"` chains.

Output: drop the lists; each profile's `resolve` already validates its
own fill set (the negative checks at the top of `resolveDamageReduction`
and `resolveRollModifier` already do this). If the lists carried
additional logic, fold into the relevant profile's resolve.

### Task 75 - SPP-W9-09-CONSOLIDATE-RESOLVE-DISPATCH - Replace spells-resolve.ts procedure switch with registry iteration

Status: `blocked`

Input: `spells-resolve.ts` — the giant `if (invocation.procedure === "X")
return resolveX(...)` ladder.

Output:
```ts
const profile = spellProcedureProfileFor(invocation.procedure);
return profile.resolve({...});
```
spells-resolve.ts shrinks dramatically.

Acceptance: typecheck clean, full MBT subset passes.

### Task 76 - SPP-W9-10-CONSOLIDATE-DISCOVERY-DISPATCH - Replace spells-discovery.ts switches

Status: `blocked`

Input: `spells-discovery.ts` `discoverBattleActs` per-procedure branches,
and `spellInvocationCastSummary` per-procedure branches.

Output: each replaced with
`profile.discoverCastAct(...)` / `profile.castSummary(...)`.

### Task 77 - SPP-W9-11-CONSOLIDATE-INVOCATION-REF - Replace spells-invocation-ref.ts Match cascade

Status: `blocked`

Input: `spells-invocation-ref.ts:supportedSpellInvocationRef`.

Output: replace the Match cascade with
`spellProcedureProfileFor(invocation.procedure).invocationRef(invocation)`.

### Wave 10 — Verify and close

### Task 78 - SPP-W10-01-FULL-SUITE-PARITY-RUN - Run full MBT suite

Status: `blocked`

Run every `*.mbt.test.ts` (sequentially per CLAUDE.md "one MBT at a time"
rule, or in carefully isolated batches). Total budget ~70 tests × ~90s
average = ~2 hours wall-clock. Wrap each with the timing shell and
report durations.

Acceptance: 100% pass. If any fails, file as a Wave 9 follow-up before
declaring done.

### Task 79 - SPP-W10-02-DELETE-DEAD-DISPATCH - Delete now-empty dispatch shells

Status: `blocked`

Input: `spells-resolve-support-effects.ts`,
`spells-active-effects.ts` (rollModifier and damageReduction-shaped
applyEffect functions), `spells-profiles-support.ts` (admit predicates),
`spells-discovery.ts` (per-procedure branches now consolidated).

Output: anything that has become empty deletes; anything that has
become a thin re-export gets folded into the importer.

Acceptance: typecheck clean. No imports point at deleted files.

### Task 80 - SPP-W10-03-DOCS-AND-ADR - Write the ADR; update README; close lane

Status: `blocked`

Input: registry state at end of Wave 9; original ADR-0001 (forest of QNT
slices); the directory README.

Output: a new ADR (`docs/adr/0002-spell-procedure-profile-registry.md`)
recording the decision and the migration outcome (number of profiles,
final file sizes, what's left). README updated to reflect "migration
complete; pattern is the law of the package."

Acceptance: ADR reviewed and merged. Update this plan's index to
status `done`.

## Done-criteria for the whole lane

- All 67 procedures registered in `REGISTERED_SPELL_PROCEDURE_PROFILES`.
- Each procedure's behavior code lives in exactly one file under
  `spell-procedure-profiles/`. No `procedure === "X"` switch remains
  anywhere in `battle-runtime/src/battle-reducer/` outside the profile
  files themselves.
- `battle-codecs.ts` shrinks to a thin composition over registered
  schemas.
- `metamagic.ts` table is derived, not hand-maintained.
- All MBT tests pass.
- ADR-0002 records the decision.

## Cost estimate

- Wave 1: 1 task, ~2 hours (interface widening + retesting both existing profiles).
- Waves 2–8: 65 per-profile tasks. Per task ~1–3 hours including MBT.
  Optimistic: ~110 hours total. Realistic with discovery surprises: ~180.
- Wave 9: 11 tasks. Each touches many files. Per task ~3–5 hours.
  ~40 hours total.
- Wave 10: 3 tasks. ~6 hours.

Total: ~160–230 hours of focused work. Parallelisable across multiple
Ralph agents up to ~5 concurrent (limited by MBT machine-time
serialization per CLAUDE.md "one MBT at a time" rule and the
.quint-cache priming step).
