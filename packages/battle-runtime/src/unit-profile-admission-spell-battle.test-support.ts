import { optionalProperty } from "./optional-property.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { abilityModifier } from "@dnd/shared-algebras/armor-class-algebra";
import { proficiencyBonus, type ProficiencyBonus } from "@dnd/shared/types";
import type {
  ClassName,
  SpellRecord,
  StatBlockRecord,
  WeaponProficiency,
} from "@dnd/surface/surface/types";
import * as Either from "effect/Either";
import { expect } from "vitest";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import {
  battleId,
  cantripSpellInvocationRef,
  endTurn,
  resolveBattleInterrupt,
  resolveBattleSubject,
  startBattle,
  type BattleCreatureInit,
  type BattleResolutionResult,
  type BattleState,
  type BattleRuntimeSession,
  type CombatantId,
} from "./index.ts";
import {
  interruptDecisionFill,
  requireCharacterSpellProcedureRefForTest,
  resolveReadySpellForTest,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import {
  animalFriendshipUnitId,
  rayOfFrostUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  characterCreature,
  requireHole,
  requireResultHole,
  statBlockCreature,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  savingThrowOutcomeFill,
  spellAct,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  singleSpellcastingSourceClassName,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";

export function spellBattle(input: {
  readonly casterId?: CombatantId;
  readonly casterSpellcastingSourceClassName?: ClassName;
  readonly cantrips?: readonly SpellRecord[];
  readonly preparedSpells?: readonly SpellRecord[];
  readonly attack?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"];
  readonly offHandAttack?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["offHandAttack"];
  readonly selectedLoadout?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["selectedLoadout"];
  readonly spellSlots?: readonly {
    readonly spellLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
    readonly count: number;
  }[];
  readonly extraTargetIds?: readonly CombatantId[];
  readonly extraTargetHp?: number;
  readonly extraTargetMaxHp?: number;
  readonly targetHp?: number;
  readonly targetMaxHp?: number;
  readonly targetStatBlock?: StatBlockRecord;
  readonly targetAttack?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"];
  readonly targetArmorClass?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["armorClass"];
  readonly targetResources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
  readonly targetUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
  readonly targetUnitFeatures?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"];
  readonly targetClassLevels?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"];
  readonly targetSpellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
  readonly targetPreparedSpells?: readonly SpellRecord[];
  readonly casterClassLevels?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"];
  readonly casterD20Statistics?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["d20Statistics"];
  readonly casterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
  readonly casterUnitFeatures?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"];
  readonly casterResources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
  readonly casterMetamagic?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["metamagic"];
  readonly casterProficiencyBonus?: ProficiencyBonus;
  readonly casterWeaponProficiencies?: readonly WeaponProficiency[];
  readonly statBlockTargets?: readonly {
    readonly combatantId: CombatantId;
    readonly statBlock: StatBlockRecord;
    readonly initiative: number;
  }[];
}): BattleRuntimeSession {
  const casterId = input.casterId ?? spellCasterId;
  const casterClassLevels = input.casterClassLevels ?? [
    { className: "wizard", level: 1 },
  ];
  const result = startBattle({
    battleId: battleId("unit-profile-spell-admission"),
    combatants: [
      characterCreature({
        combatantId: casterId,
        displayName: "Spellcaster",
        initiative: 20,
        spellcasting: {
          spellcastingSource: {
            tag: "classSpellcasting",
            className:
              input.casterSpellcastingSourceClassName ??
              singleSpellcastingSourceClassName(casterClassLevels),
            abilityModifier: abilityModifier(3),
          },
          proficiencyBonus: input.casterProficiencyBonus ?? proficiencyBonus(2),
          canCastSpells: true,
          cantrips: input.cantrips ?? [],
          preparedSpells: input.preparedSpells ?? [],
          featurePreparedSpells: [],
          spellAccesses: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: input.spellSlots ?? [{ spellLevel: 1, count: 2 }],
        },
        ...optionalProperty("attack", input.attack),
        ...optionalProperty("offHandAttack", input.offHandAttack),
        ...optionalProperty("selectedLoadout", input.selectedLoadout),
        classLevels: casterClassLevels,
        ...optionalProperty("d20Statistics", input.casterD20Statistics),
        ...optionalProperty(
          "weaponProficiencies",
          input.casterWeaponProficiencies,
        ),
        ...optionalProperty("characterUnitRefs", input.casterUnitRefs),
        ...optionalProperty("unitFeatures", input.casterUnitFeatures),
        ...optionalProperty("resources", input.casterResources),
        ...optionalProperty("metamagic", input.casterMetamagic),
      }),
      ...(input.targetStatBlock === undefined
        ? [
            characterCreature({
              combatantId: spellTargetId,
              displayName: "Target",
              initiative: 10,
              ...optionalProperty("attack", input.targetAttack),
              ...optionalProperty("armorClass", input.targetArmorClass),
              ...optionalProperty("currentHp", input.targetHp),
              ...optionalProperty("maxHp", input.targetMaxHp),
              ...optionalProperty("resources", input.targetResources),
              ...optionalProperty("characterUnitRefs", input.targetUnitRefs),
              ...optionalProperty("unitFeatures", input.targetUnitFeatures),
              ...optionalProperty("classLevels", input.targetClassLevels),
              ...(input.targetSpellcasting === undefined &&
              input.targetPreparedSpells === undefined
                ? {}
                : {
                    spellcasting: input.targetSpellcasting ?? {
                      spellcastingSource: {
                        tag: "classSpellcasting",
                        className: "wizard",
                        abilityModifier: abilityModifier(3),
                      },
                      proficiencyBonus: proficiencyBonus(2),
                      canCastSpells: true,
                      cantrips: [],
                      preparedSpells: input.targetPreparedSpells ?? [],
                      featurePreparedSpells: [],
                      spellAccesses: [],
                      spellbookRitualSpellAccesses: [],
                      invocationSpellAccesses: [],
                      spellSlots: [{ spellLevel: 1, count: 1 }],
                    },
                  }),
            }),
          ]
        : [
            statBlockCreature({
              combatantId: spellTargetId,
              statBlock: input.targetStatBlock,
              initiative: 10,
            }),
          ]),
      ...(input.extraTargetIds ?? []).map((combatantId, index) =>
        characterCreature({
          combatantId,
          displayName: `Target ${index + 2}`,
          initiative: 9 - index,
          ...optionalProperty("currentHp", input.extraTargetHp),
          ...optionalProperty("maxHp", input.extraTargetMaxHp),
        }),
      ),
      ...(input.statBlockTargets ?? []).map((target) =>
        statBlockCreature({
          combatantId: target.combatantId,
          statBlock: target.statBlock,
          initiative: target.initiative,
        }),
      ),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(battleStateInitIssueMessage(result.left));
  }
  return result.right;
}

type SpellBattleWithTargetRayOfFrostInput = Omit<
  Parameters<typeof spellBattle>[0],
  "targetId" | "targetSpellcasting"
>;

export function spellBattleWithTargetRayOfFrost(
  input: SpellBattleWithTargetRayOfFrostInput = {},
): BattleRuntimeSession {
  const rayOfFrost = spellRecord(rayOfFrostUnitId);
  return spellBattle({
    ...input,
    targetSpellcasting: wizardSpellcasting({
      cantrips: [rayOfFrost],
      preparedSpells: [],
    }),
  });
}

export function readyTargetRayOfFrost(
  session: BattleRuntimeSession,
): BattleRuntimeSession {
  const readied = resolveReadySpellForTest({
    state: session.state,
    actorId: spellTargetId,
    procedureRef: requireCharacterSpellProcedureRefForTest(
      session,
      spellTargetId,
      cantripSpellInvocationRef(rayOfFrostUnitId, "spellAttackDamage"),
    ),
    trigger: "saveFailed",
  });
  if (readied.tag !== "resolved") {
    throw new Error("Expected target to Ready Ray of Frost.");
  }
  if (readied.state.readiedSpells.get(spellTargetId) === undefined) {
    throw new Error("Expected target to hold the readied Ray of Frost.");
  }
  return battleRuntimeSessionForTest({ ...session, state: readied.state });
}

export function endCasterTurnAndReadyTargetRayOfFrost(input: {
  readonly session: BattleRuntimeSession;
  readonly casterId: Parameters<typeof endTurn>[0]["actorId"];
}): BattleRuntimeSession {
  const targetTurn = endTurn({
    state: input.session.state,
    actorId: input.casterId,
  });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected caster End Turn before Ready setup.");
  }
  return readyTargetRayOfFrost(
    battleRuntimeSessionForTest({
      ...input.session,
      state: targetTurn.state,
    }),
  );
}

export function spellBattleWithTargetReadiedRay(
  input: SpellBattleWithTargetRayOfFrostInput = {},
): BattleRuntimeSession {
  const session = spellBattleWithTargetRayOfFrost(input);
  const casterId = input.casterId ?? spellCasterId;
  const readied = endCasterTurnAndReadyTargetRayOfFrost({
    session,
    casterId,
  });
  const afterTargetTurn = endTurn({
    state: readied.state,
    actorId: spellTargetId,
  });
  if (afterTargetTurn.tag !== "resolved") {
    throw new Error("Expected target End Turn after Ready setup.");
  }
  return battleRuntimeSessionForTest({
    ...session,
    state: afterTargetTurn.state,
  });
}

export function declineTargetReadiedSpellAfterFailedSave(
  result: BattleResolutionResult,
  responderId: CombatantId = spellTargetId,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  if (result.tag !== "needsHoles") {
    throw new Error("Expected a failed-save Reaction window.");
  }
  const pendingInterrupt = result.snapshot.pendingInterrupt;
  if (
    pendingInterrupt === null ||
    pendingInterrupt.trigger !== "saveFailed" ||
    pendingInterrupt.decisionHole.trigger !== "saveFailed"
  ) {
    throw new Error("Expected a saveFailed interrupt decision.");
  }
  const ownsReadiedSpell = pendingInterrupt.choices.some(
    (choice) =>
      choice.kind === "releaseReadiedSpell" &&
      choice.readiedSpellCasterId === responderId,
  );
  if (!ownsReadiedSpell) {
    throw new Error("Expected the target to own the readied-spell Reaction.");
  }
  const declined = resolveBattleInterrupt({
    state: result.state,
    fill: interruptDecisionFill(pendingInterrupt.decisionHole, {
      kind: "decline",
      responderId,
    }),
  });
  if (declined.tag !== "resolved") {
    throw new Error("Expected the failed-save Reaction decline to resume.");
  }
  if (declined.snapshot.pendingInterrupt !== null) {
    throw new Error("Expected the resumed spell to clear the Reaction window.");
  }
  return declined;
}

export function resolvedAnimalFriendshipState(
  beastId: CombatantId,
  additionalStatBlockTargets: NonNullable<
    Parameters<typeof spellBattle>[0]["statBlockTargets"]
  >,
  sourceCasterId: CombatantId = spellCasterId,
): BattleState {
  const spell = spellRecord(animalFriendshipUnitId);
  const session = spellBattle({
    casterId: sourceCasterId,
    preparedSpells: [spell],
    statBlockTargets: [
      {
        combatantId: beastId,
        statBlock: statBlockWithCreatureType("beast"),
        initiative: 9,
      },
      ...additionalStatBlockTargets,
    ],
  });
  const state = session.state;
  const act = spellAct({ session, spellId: animalFriendshipUnitId });
  const targetHole = requireHole(act.initialHoles, "spellTargetList");
  const targetFill = spellTargetListFill(
    targetHole,
    sourceCasterId,
    animalFriendshipUnitId,
    [beastId],
  );
  const saveHole = requireResultHole(
    resolveBattleSubject({ state, subject: act.subject, fills: [targetFill] }),
    "savingThrowOutcome",
  );
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      targetFill,
      savingThrowOutcomeFill(saveHole, [
        { targetId: beastId, succeeded: false },
      ]),
    ],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Animal Friendship to resolve.");
  }
  return resolved.state;
}
