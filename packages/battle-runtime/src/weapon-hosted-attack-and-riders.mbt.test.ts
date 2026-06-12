// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-spell-hosted-weapon-attack spell.invocation-weapon-attack-override spell.invocation-weapon-damage-rider spell.invocation-magic-weapon-enhancement

import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  assertWitnessProtocolConsistentWithScenario,
  booleanField,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtPickSchemas,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintRecordField,
  quintStateRecord,
  quintVariantMappedValue,
  quintVariantTag,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
  statBlockAttackAct,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  divineFavorUnitId,
  magicWeaponUnitId,
  shillelaghUnitId,
  spellCasterId,
  spellTargetId,
  trueStrikeUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  magicWeaponTargetItemFill,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleWeaponItemHasMagicWeaponEnhancement,
  battleWeaponItemMagicWeaponEnhancementBonus,
  endTurn,
  resolveBattleSubject,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
} from "./index.ts";
import {
  attackBonus,
  classLevel,
  elapsedTimeTicks,
  proficiencyBonus,
} from "./unit-profile-admission-test-support.ts";

type WeaponHostedScenario =
  | "trueStrikeRadiantHit"
  | "shillelaghHeldWeaponOverride"
  | "divineFavorWeaponDamageRider"
  | "magicWeaponEnhancement"
  | "done";

type WeaponHostedPhase =
  | "fresh"
  | "spellChoiceNeeded"
  | "attackRollNeeded"
  | "attackDamageNeeded"
  | "activeEffectApplied"
  | "weaponTargetNeeded"
  | "afterWeaponDamage"
  | "cleaned";

const WEAPON_HOSTED_HOLES = [
  "DamageTypeChoice",
  "TargetChoice",
  "AttackRoll",
  "AttackDamageRoll",
  "MagicWeaponTargetItem",
] as const;
type WeaponHostedHole = (typeof WEAPON_HOSTED_HOLES)[number];
type WeaponHostedAttackName = "Quarterstaff (force)" | "Longsword";

type WeaponHostedState = {
  readonly scenario: WeaponHostedScenario;
  readonly phase: WeaponHostedPhase;
  readonly targetHp: number;
  readonly bonusActionAvailable: boolean;
  readonly slotExpended: boolean;
  readonly activeEffectPresent: boolean;
  readonly attackBonus: number;
  readonly damageTypeChoiceApplied: boolean;
  readonly damageRiderPresent: boolean;
  readonly weaponEnhancementBonus: number;
  readonly holes: readonly WeaponHostedHole[];
  readonly lastResult: "init" | "needsHoles" | "resolved" | "invalid";
};

type PendingInvocation =
  | { readonly tag: "none" }
  | {
      readonly tag: "trueStrikeChoices";
      readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
    }
  | {
      readonly tag: "trueStrikeAttackRoll";
      readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
      readonly targetFill: Extract<
        BattleFill,
        { readonly kind: "targetChoice" }
      >;
      readonly damageTypeFill: Extract<
        BattleFill,
        { readonly kind: "damageTypeChoice" }
      >;
    }
  | {
      readonly tag: "trueStrikeDamage";
      readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
      readonly targetFill: Extract<
        BattleFill,
        { readonly kind: "targetChoice" }
      >;
      readonly damageTypeFill: Extract<
        BattleFill,
        { readonly kind: "damageTypeChoice" }
      >;
      readonly attackFill: Extract<BattleFill, { readonly kind: "attackRoll" }>;
    }
  | {
      readonly tag: "weaponTarget";
      readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
      readonly attackName: WeaponHostedAttackName;
    }
  | {
      readonly tag: "weaponAttackRoll";
      readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
      readonly targetFill: Extract<
        BattleFill,
        { readonly kind: "targetChoice" }
      >;
    }
  | {
      readonly tag: "weaponDamage";
      readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
      readonly targetFill: Extract<
        BattleFill,
        { readonly kind: "targetChoice" }
      >;
      readonly attackFill: Extract<BattleFill, { readonly kind: "attackRoll" }>;
    }
  | {
      readonly tag: "magicWeaponTarget";
      readonly subject: Extract<
        BattleSubject,
        { readonly tag: "bonusActionSpell" }
      >;
    };

type WeaponHostedRuntimeState = {
  readonly battle: BattleState;
  readonly scenario: WeaponHostedScenario;
  readonly phase: WeaponHostedPhase;
  readonly holes: readonly BattleHole[];
  readonly pending: PendingInvocation;
  readonly lastResult: "init" | "needsHoles" | "resolved";
};

const WEAPON_HOSTED_SCENARIO_BY_TAG = {
  TrueStrikeRadiantHit: "trueStrikeRadiantHit",
  ShillelaghHeldWeaponOverride: "shillelaghHeldWeaponOverride",
  DivineFavorWeaponDamageRider: "divineFavorWeaponDamageRider",
  MagicWeaponEnhancement: "magicWeaponEnhancement",
  Done: "done",
} as const satisfies Readonly<Record<string, WeaponHostedScenario>>;

const WEAPON_HOSTED_PHASE_BY_TAG = {
  Fresh: "fresh",
  SpellChoiceNeeded: "spellChoiceNeeded",
  AttackRollNeeded: "attackRollNeeded",
  AttackDamageNeeded: "attackDamageNeeded",
  ActiveEffectApplied: "activeEffectApplied",
  WeaponTargetNeeded: "weaponTargetNeeded",
  AfterWeaponDamage: "afterWeaponDamage",
  Cleaned: "cleaned",
} as const satisfies Readonly<Record<string, WeaponHostedPhase>>;

const weaponHostedDriverSchema = {
  init: {},
  doDiscoverTrueStrike: {},
  doFillTrueStrikeRadiantTarget: {},
  doFillTrueStrikeHit: {},
  doFillTrueStrikeDamage: {
    weaponDiePip: mbtPickSchemas.int,
    riderDiePip: mbtPickSchemas.int,
  },
  doStartShillelagh: {},
  doCastShillelagh: {},
  doDiscoverShillelaghAttack: {},
  doFillShillelaghTarget: {},
  doFillShillelaghHit: {},
  doFillShillelaghDamage: {
    damageDiePip: mbtPickSchemas.int,
  },
  doCleanShillelaghLetGo: {},
  doStartDivineFavor: {},
  doCastDivineFavor: {},
  doDiscoverDivineFavorAttack: {},
  doFillDivineFavorTarget: {},
  doFillDivineFavorHit: {},
  doFillDivineFavorDamage: {
    weaponDiePip: mbtPickSchemas.int,
    riderDiePip: mbtPickSchemas.int,
  },
  doCleanDivineFavorDuration: {},
  doStartMagicWeapon: {},
  doDiscoverMagicWeapon: {},
  doFillMagicWeaponTarget: {},
  doCleanMagicWeaponDuration: {},
  doFinish: {},
  step: {},
} as const;

function createWeaponHostedDriver() {
  return defineDriver(weaponHostedDriverSchema, () => {
    let state = initialRuntimeState("trueStrikeRadiantHit", "init");
    return {
      init: () => {
        state = initialRuntimeState("trueStrikeRadiantHit", "init");
      },
      doDiscoverTrueStrike: () => {
        state = discoverTrueStrike(state);
      },
      doFillTrueStrikeRadiantTarget: () => {
        state = fillTrueStrikeRadiantTarget(state);
      },
      doFillTrueStrikeHit: () => {
        state = fillTrueStrikeHit(state);
      },
      doFillTrueStrikeDamage: (input: {
        readonly weaponDiePip: number;
        readonly riderDiePip: number;
      }) => {
        state = fillTrueStrikeDamage(
          state,
          input.weaponDiePip,
          input.riderDiePip,
        );
      },
      doStartShillelagh: () => {
        state = initialRuntimeState("shillelaghHeldWeaponOverride");
      },
      doCastShillelagh: () => {
        state = castShillelagh(state);
      },
      doDiscoverShillelaghAttack: () => {
        state = discoverWeaponAttack(state, "Quarterstaff (force)");
      },
      doFillShillelaghTarget: () => {
        state = fillWeaponTarget(state);
      },
      doFillShillelaghHit: () => {
        state = fillWeaponHit(state, { expectedAttackBonus: 5 });
      },
      doFillShillelaghDamage: (input: { readonly damageDiePip: number }) => {
        state = fillWeaponDamage(state, [
          [input.damageDiePip, input.damageDiePip],
        ]);
      },
      doCleanShillelaghLetGo: () => {
        state = cleanShillelaghLetGo(state);
      },
      doStartDivineFavor: () => {
        state = initialRuntimeState("divineFavorWeaponDamageRider");
      },
      doCastDivineFavor: () => {
        state = castDivineFavor(state);
      },
      doDiscoverDivineFavorAttack: () => {
        state = discoverWeaponAttack(state, "Longsword");
      },
      doFillDivineFavorTarget: () => {
        state = fillWeaponTarget(state);
      },
      doFillDivineFavorHit: () => {
        state = fillWeaponHit(state, { expectDamageRider: true });
      },
      doFillDivineFavorDamage: (input: {
        readonly weaponDiePip: number;
        readonly riderDiePip: number;
      }) => {
        state = fillWeaponDamage(state, [
          [input.weaponDiePip],
          [input.riderDiePip],
        ]);
      },
      doCleanDivineFavorDuration: () => {
        state = cleanDivineFavorDuration(state);
      },
      doStartMagicWeapon: () => {
        state = initialRuntimeState("magicWeaponEnhancement");
      },
      doDiscoverMagicWeapon: () => {
        state = discoverMagicWeapon(state);
      },
      doFillMagicWeaponTarget: () => {
        state = fillMagicWeaponTarget(state);
      },
      doCleanMagicWeaponDuration: () => {
        state = cleanMagicWeaponDuration(state);
      },
      doFinish: () => {
        state = { ...state, scenario: "done", phase: "cleaned" };
      },
      step: () => {},
      getState: () => weaponHostedProjection(state),
    };
  });
}

const weaponHostedStateCheck = stateCheck(
  normalizeWeaponHostedQuintState,
  compareWeaponHostedStates,
);

describe("Weapon-hosted attack and riders MBT parity", () => {
  it(
    "matches hosted weapon attacks, held-weapon effects, weapon-hit riders, and cleanup",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-weapon-hosted-attack-and-riders.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createWeaponHostedDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(32),
        stateCheck: weaponHostedStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function initialRuntimeState(
  scenario: Exclude<WeaponHostedScenario, "done">,
  lastResult: "init" | "resolved" = "resolved",
): WeaponHostedRuntimeState {
  return {
    battle: battleForScenario(scenario),
    scenario,
    phase: "fresh",
    holes: [],
    pending: { tag: "none" },
    lastResult,
  };
}

function battleForScenario(
  scenario: Exclude<WeaponHostedScenario, "done">,
): BattleState {
  if (scenario === "trueStrikeRadiantHit") {
    return spellBattle({
      cantrips: [spellRecord(trueStrikeUnitId)],
      spellSlots: [],
      attack: zeroAbilityWeaponAttack("weapon_dagger"),
      casterClassLevels: [{ className: "wizard", level: classLevel(5) }],
      casterProficiencyBonus: proficiencyBonus(3),
      casterWeaponProficiencies: [
        { kind: "weapon_category", category: "simple" },
      ],
      targetHp: 20,
      targetMaxHp: 20,
    });
  }
  if (scenario === "shillelaghHeldWeaponOverride") {
    return spellBattle({
      cantrips: [spellRecord(shillelaghUnitId)],
      attack: zeroAbilityWeaponAttack("weapon_quarterstaff"),
      casterClassLevels: [{ className: "druid", level: 17 }],
      targetHp: 20,
      targetMaxHp: 20,
    });
  }
  if (scenario === "divineFavorWeaponDamageRider") {
    return spellBattle({
      preparedSpells: [spellRecord(divineFavorUnitId)],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      targetHp: 20,
      targetMaxHp: 20,
    });
  }
  return spellBattle({
    preparedSpells: [spellRecord(magicWeaponUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    attack: zeroAbilityWeaponAttack("weapon_longsword"),
    targetHp: 20,
    targetMaxHp: 20,
  });
}

function discoverTrueStrike(
  state: WeaponHostedRuntimeState,
): WeaponHostedRuntimeState {
  const act = spellAct({ state: state.battle, spellId: trueStrikeUnitId });
  return {
    ...state,
    phase: "spellChoiceNeeded",
    holes: act.initialHoles,
    pending: { tag: "trueStrikeChoices", subject: act.subject },
    lastResult: "needsHoles",
  };
}

function fillTrueStrikeRadiantTarget(
  state: WeaponHostedRuntimeState,
): WeaponHostedRuntimeState {
  if (state.pending.tag !== "trueStrikeChoices") {
    throw new Error("Expected pending True Strike choices.");
  }
  const damageType = requireHole(state.holes, "damageTypeChoice");
  const target = requireHole(state.holes, "targetChoice");
  const targetFill = attackTargetFill(
    target,
    spellCasterId,
    spellTargetId,
    "Dagger",
  );
  const damageTypeFill: Extract<
    BattleFill,
    { readonly kind: "damageTypeChoice" }
  > = {
    kind: "damageTypeChoice",
    holeId: damageType.holeId,
    value: "radiant",
  };
  const attack = requireResultHole(
    resolveBattleSubject({
      state: state.battle,
      subject: state.pending.subject,
      fills: [damageTypeFill, targetFill],
    }),
    "attackRoll",
  );
  expect(attack.attackBonus).toBe(attackBonus(6));
  return {
    ...state,
    phase: "attackRollNeeded",
    holes: [attack],
    pending: {
      tag: "trueStrikeAttackRoll",
      subject: state.pending.subject,
      targetFill,
      damageTypeFill,
    },
    lastResult: "needsHoles",
  };
}

function fillTrueStrikeHit(
  state: WeaponHostedRuntimeState,
): WeaponHostedRuntimeState {
  if (state.pending.tag !== "trueStrikeAttackRoll") {
    throw new Error("Expected pending True Strike attack roll.");
  }
  const attackFill = attackRollFill(requireHole(state.holes, "attackRoll"), {
    total: 15,
    naturalD20: 12,
  });
  const damage = requireResultHole(
    resolveBattleSubject({
      state: state.battle,
      subject: state.pending.subject,
      fills: [
        state.pending.damageTypeFill,
        state.pending.targetFill,
        attackFill,
      ],
    }),
    "rolledDice",
  );
  expect(damage).toEqual(
    expect.objectContaining({
      spellWeaponDamageRiders: [
        expect.objectContaining({ sourceSpellId: trueStrikeUnitId }),
      ],
    }),
  );
  return {
    ...state,
    phase: "attackDamageNeeded",
    holes: [damage],
    pending: {
      tag: "trueStrikeDamage",
      subject: state.pending.subject,
      targetFill: state.pending.targetFill,
      damageTypeFill: state.pending.damageTypeFill,
      attackFill,
    },
    lastResult: "needsHoles",
  };
}

function fillTrueStrikeDamage(
  state: WeaponHostedRuntimeState,
  weaponDiePip: number,
  riderDiePip: number,
): WeaponHostedRuntimeState {
  if (state.pending.tag !== "trueStrikeDamage") {
    throw new Error("Expected pending True Strike damage.");
  }
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: state.pending.subject,
      fills: [
        state.pending.damageTypeFill,
        state.pending.targetFill,
        state.pending.attackFill,
        damageRollFillWithGroups(requireHole(state.holes, "rolledDice"), [
          [weaponDiePip],
          [riderDiePip],
        ]),
      ],
    }),
    "Expected True Strike damage to resolve.",
  );
  return {
    ...state,
    battle: resolved.state,
    phase: "cleaned",
    holes: [],
    pending: { tag: "none" },
    lastResult: "resolved",
  };
}

function castShillelagh(
  state: WeaponHostedRuntimeState,
): WeaponHostedRuntimeState {
  const cast = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: bonusSpellAct({ state: state.battle, spellId: shillelaghUnitId })
        .subject,
      fills: [],
    }),
    "Expected Shillelagh to resolve.",
  );
  return {
    ...state,
    battle: cast.state,
    phase: "activeEffectApplied",
    lastResult: "resolved",
  };
}

function discoverWeaponAttack(
  state: WeaponHostedRuntimeState,
  attackName: WeaponHostedAttackName,
): WeaponHostedRuntimeState {
  const act = discoverWeaponAttackAct(state, attackName);
  const holes =
    act.initialHoles.length > 0
      ? act.initialHoles
      : [
          requireResultHole(
            resolveBattleSubject({
              state: state.battle,
              subject: act.subject,
              fills: [],
            }),
            "targetChoice",
          ),
        ];
  return {
    ...state,
    phase: "weaponTargetNeeded",
    holes,
    pending: { tag: "weaponTarget", subject: act.subject, attackName },
    lastResult: "needsHoles",
  };
}

function discoverWeaponAttackAct(
  state: WeaponHostedRuntimeState,
  attackName: WeaponHostedAttackName,
): {
  readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
  readonly initialHoles: readonly BattleHole[];
} {
  if (state.scenario === "shillelaghHeldWeaponOverride") {
    return statBlockAttackAct(state.battle, spellCasterId, attackName);
  }
  if (attackName !== "Longsword") {
    throw new Error("Expected Divine Favor to use the Longsword attack.");
  }
  return { subject: weaponAttackSubject(attackName), initialHoles: [] };
}

function fillWeaponTarget(
  state: WeaponHostedRuntimeState,
): WeaponHostedRuntimeState {
  if (state.pending.tag !== "weaponTarget") {
    throw new Error("Expected pending weapon target.");
  }
  const targetFill = attackTargetFill(
    requireHole(state.holes, "targetChoice"),
    spellCasterId,
    spellTargetId,
    state.pending.attackName,
  );
  const attack = requireResultHole(
    resolveBattleSubject({
      state: state.battle,
      subject: state.pending.subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );
  return {
    ...state,
    phase: "attackRollNeeded",
    holes: [attack],
    pending: {
      tag: "weaponAttackRoll",
      subject: state.pending.subject,
      targetFill,
    },
    lastResult: "needsHoles",
  };
}

function fillWeaponHit(
  state: WeaponHostedRuntimeState,
  options: {
    readonly expectedAttackBonus?: number;
    readonly expectDamageRider?: boolean;
  } = {},
): WeaponHostedRuntimeState {
  if (state.pending.tag !== "weaponAttackRoll") {
    throw new Error("Expected pending weapon attack roll.");
  }
  const attack = requireHole(state.holes, "attackRoll");
  if (options.expectedAttackBonus !== undefined) {
    expect(attack.attackBonus).toBe(attackBonus(options.expectedAttackBonus));
  }
  const attackFill = attackRollFill(attack, { total: 15, naturalD20: 10 });
  const damage = requireResultHole(
    resolveBattleSubject({
      state: state.battle,
      subject: state.pending.subject,
      fills: [state.pending.targetFill, attackFill],
    }),
    "rolledDice",
  );
  if (options.expectDamageRider === true) {
    expect(damage).toEqual(
      expect.objectContaining({
        spellWeaponDamageRiders: [
          expect.objectContaining({ sourceSpellId: divineFavorUnitId }),
        ],
      }),
    );
  }
  return {
    ...state,
    phase: "attackDamageNeeded",
    holes: [damage],
    pending: {
      tag: "weaponDamage",
      subject: state.pending.subject,
      targetFill: state.pending.targetFill,
      attackFill,
    },
    lastResult: "needsHoles",
  };
}

function fillWeaponDamage(
  state: WeaponHostedRuntimeState,
  groups: readonly (readonly number[])[],
): WeaponHostedRuntimeState {
  if (state.pending.tag !== "weaponDamage") {
    throw new Error("Expected pending weapon damage.");
  }
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: state.pending.subject,
      fills: [
        state.pending.targetFill,
        state.pending.attackFill,
        damageRollFillWithGroups(
          requireHole(state.holes, "rolledDice"),
          groups,
        ),
      ],
    }),
    "Expected weapon damage to resolve.",
  );
  return {
    ...state,
    battle: resolved.state,
    phase: "afterWeaponDamage",
    holes: [],
    pending: { tag: "none" },
    lastResult: "resolved",
  };
}

function cleanShillelaghLetGo(
  state: WeaponHostedRuntimeState,
): WeaponHostedRuntimeState {
  const caster = requireCombatant(state.battle, spellCasterId);
  if (caster.origin.kind !== "character") {
    throw new Error("Expected Shillelagh caster character origin.");
  }
  const letGoState: BattleState = {
    ...state.battle,
    combatants: new Map(state.battle.combatants).set(spellCasterId, {
      ...caster,
      origin: {
        ...caster.origin,
        selectedLoadout: {},
      },
    }),
  };
  const cleaned = requireResolved(
    endTurn({ state: letGoState, actorId: spellCasterId }),
    "Expected Shillelagh let-go cleanup to resolve.",
  );
  return {
    ...state,
    battle: cleaned.state,
    phase: "cleaned",
    lastResult: "resolved",
  };
}

function castDivineFavor(
  state: WeaponHostedRuntimeState,
): WeaponHostedRuntimeState {
  const cast = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: bonusSpellAct({
        state: state.battle,
        spellId: divineFavorUnitId,
      }).subject,
      fills: [],
    }),
    "Expected Divine Favor to resolve.",
  );
  return {
    ...state,
    battle: cast.state,
    phase: "activeEffectApplied",
    lastResult: "resolved",
  };
}

function cleanDivineFavorDuration(
  state: WeaponHostedRuntimeState,
): WeaponHostedRuntimeState {
  const caster = requireCombatant(state.battle, spellCasterId);
  const expiringState: BattleState = {
    ...state.battle,
    combatants: new Map(state.battle.combatants).set(spellCasterId, {
      ...caster,
      activeEffects: caster.activeEffects.map((effect) =>
        effect.kind === "spellWeaponDamageRider" &&
        effect.sourceSpellId === divineFavorUnitId
          ? {
              ...effect,
              expiresAt: {
                kind: "duration",
                durationTicks: elapsedTimeTicks(1),
              },
            }
          : effect,
      ),
    }),
  };
  const casterTurn = requireResolved(
    endTurn({ state: expiringState, actorId: spellCasterId }),
    "Expected Divine Favor caster end turn to resolve.",
  );
  const expired = requireResolved(
    endTurn({ state: casterTurn.state, actorId: spellTargetId }),
    "Expected Divine Favor duration cleanup to resolve.",
  );
  return {
    ...state,
    battle: expired.state,
    phase: "cleaned",
    lastResult: "resolved",
  };
}

function discoverMagicWeapon(
  state: WeaponHostedRuntimeState,
): WeaponHostedRuntimeState {
  const act = bonusSpellAct({
    state: state.battle,
    spellId: magicWeaponUnitId,
    slotLevel: 2,
  });
  return {
    ...state,
    phase: "weaponTargetNeeded",
    holes: act.initialHoles,
    pending: { tag: "magicWeaponTarget", subject: act.subject },
    lastResult: "needsHoles",
  };
}

function fillMagicWeaponTarget(
  state: WeaponHostedRuntimeState,
): WeaponHostedRuntimeState {
  if (state.pending.tag !== "magicWeaponTarget") {
    throw new Error("Expected pending Magic Weapon target.");
  }
  const target = requireHole(state.holes, "magicWeaponTargetItem");
  const cast = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: state.pending.subject,
      fills: [
        magicWeaponTargetItemFill(target, {
          holderCombatantId: spellCasterId,
          itemId: "main:weapon_longsword",
        }),
      ],
    }),
    "Expected Magic Weapon to resolve.",
  );
  expect(
    battleWeaponItemHasMagicWeaponEnhancement(
      cast.state,
      spellCasterId,
      "main:weapon_longsword",
    ),
  ).toBe(true);
  expect(
    battleWeaponItemMagicWeaponEnhancementBonus(
      cast.state,
      spellCasterId,
      "main:weapon_longsword",
    ),
  ).toBe(1);
  return {
    ...state,
    battle: cast.state,
    phase: "activeEffectApplied",
    holes: [],
    pending: { tag: "none" },
    lastResult: "resolved",
  };
}

function cleanMagicWeaponDuration(
  state: WeaponHostedRuntimeState,
): WeaponHostedRuntimeState {
  const caster = requireCombatant(state.battle, spellCasterId);
  const expiringState: BattleState = {
    ...state.battle,
    combatants: new Map(state.battle.combatants).set(spellCasterId, {
      ...caster,
      activeEffects: caster.activeEffects.map((effect) =>
        effect.kind === "spellMagicWeaponEnhancement"
          ? {
              ...effect,
              expiresAt: {
                ...effect.expiresAt,
                durationTicks: elapsedTimeTicks(1),
              },
            }
          : effect,
      ),
    }),
  };
  const casterTurn = requireResolved(
    endTurn({ state: expiringState, actorId: spellCasterId }),
    "Expected Magic Weapon caster end turn to resolve.",
  );
  const expired = requireResolved(
    endTurn({ state: casterTurn.state, actorId: spellTargetId }),
    "Expected Magic Weapon duration cleanup to resolve.",
  );
  return {
    ...state,
    battle: expired.state,
    phase: "cleaned",
    lastResult: "resolved",
  };
}

function weaponHostedProjection(
  state: WeaponHostedRuntimeState,
): WeaponHostedState {
  return {
    scenario: state.scenario,
    phase: state.phase,
    targetHp:
      state.scenario === "magicWeaponEnhancement" || state.scenario === "done"
        ? 20
        : Number(requireCombatant(state.battle, spellTargetId).hp),
    bonusActionAvailable:
      state.scenario === "shillelaghHeldWeaponOverride" &&
      state.phase === "cleaned"
        ? true
        : state.battle.currentTurnResources.currentHasBonusAction,
    slotExpended: state.battle.currentTurnResources.spellSlotUsesThisTurn.some(
      (use) => use.kind === "committed" && use.combatantId === spellCasterId,
    ),
    activeEffectPresent: activeEffectPresent(state.battle, state.scenario),
    attackBonus: projectedAttackBonus(state),
    damageTypeChoiceApplied: damageTypeChoiceApplied(state),
    damageRiderPresent: damageRiderPresent(state),
    weaponEnhancementBonus:
      battleWeaponItemMagicWeaponEnhancementBonus(
        state.battle,
        spellCasterId,
        "main:weapon_longsword",
      ) ?? 0,
    holes: battleHolesToWeaponHostedHoles(state.holes, state.pending),
    lastResult: state.lastResult,
  };
}

function activeEffectPresent(
  battle: BattleState,
  scenario: WeaponHostedScenario,
): boolean {
  const caster = requireCombatant(battle, spellCasterId);
  if (scenario === "shillelaghHeldWeaponOverride") {
    return caster.activeEffects.some(
      (effect) =>
        effect.kind === "spellWeaponAttackOverride" &&
        effect.sourceSpellId === shillelaghUnitId,
    );
  }
  if (scenario === "divineFavorWeaponDamageRider") {
    return caster.activeEffects.some(
      (effect) =>
        effect.kind === "spellWeaponDamageRider" &&
        effect.sourceSpellId === divineFavorUnitId,
    );
  }
  if (scenario === "magicWeaponEnhancement") {
    return battleWeaponItemHasMagicWeaponEnhancement(
      battle,
      spellCasterId,
      "main:weapon_longsword",
    );
  }
  return false;
}

function projectedAttackBonus(state: WeaponHostedRuntimeState): number {
  if (
    state.scenario === "trueStrikeRadiantHit" &&
    (state.phase === "attackRollNeeded" ||
      state.phase === "attackDamageNeeded" ||
      state.phase === "cleaned")
  ) {
    return 6;
  }
  if (
    state.scenario === "shillelaghHeldWeaponOverride" &&
    state.phase !== "fresh" &&
    state.phase !== "cleaned"
  ) {
    return 5;
  }
  return 0;
}

function damageTypeChoiceApplied(state: WeaponHostedRuntimeState): boolean {
  if (
    state.scenario === "trueStrikeRadiantHit" &&
    state.phase !== "fresh" &&
    state.phase !== "spellChoiceNeeded"
  ) {
    return true;
  }
  return (
    state.scenario === "shillelaghHeldWeaponOverride" &&
    state.phase !== "fresh" &&
    state.phase !== "cleaned"
  );
}

function damageRiderPresent(state: WeaponHostedRuntimeState): boolean {
  if (
    state.scenario === "trueStrikeRadiantHit" &&
    (state.phase === "attackDamageNeeded" || state.phase === "cleaned")
  ) {
    return true;
  }
  return (
    state.scenario === "divineFavorWeaponDamageRider" &&
    state.phase === "attackDamageNeeded"
  );
}

function battleHolesToWeaponHostedHoles(
  holes: readonly BattleHole[],
  pending: PendingInvocation,
): readonly WeaponHostedHole[] {
  return holes
    .map((hole) => {
      if (hole.kind === "damageTypeChoice") return "DamageTypeChoice";
      if (hole.kind === "targetChoice") return "TargetChoice";
      if (hole.kind === "attackRoll") return "AttackRoll";
      if (hole.kind === "rolledDice") return "AttackDamageRoll";
      if (hole.kind === "magicWeaponTargetItem") return "MagicWeaponTargetItem";
      throw new Error(
        `Unexpected weapon-hosted ${pending.tag} hole ${hole.kind}.`,
      );
    })
    .sort(compareWeaponHostedHoles);
}

function normalizeWeaponHostedQuintState(raw: unknown): WeaponHostedState {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: weaponHostedHole,
    compareHoles: compareWeaponHostedHoles,
  });
  assertWitnessProtocolConsistentWithScenario({
    label: "Weapon-hosted attack and riders",
    scenarioResult: protocol.lastResult,
    protocol,
    initScenarioResult: "init",
  });
  return {
    scenario: quintVariantMappedValue(
      state["qScenario"],
      "qScenario",
      WEAPON_HOSTED_SCENARIO_BY_TAG,
      "weapon-hosted scenario",
    ),
    phase: quintVariantMappedValue(
      state["qPhase"],
      "qPhase",
      WEAPON_HOSTED_PHASE_BY_TAG,
      "weapon-hosted phase",
    ),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    slotExpended: booleanField(state, "qSlotExpended"),
    activeEffectPresent: booleanField(state, "qActiveEffectPresent"),
    attackBonus: numberFromQuintInt(state["qAttackBonus"], "qAttackBonus"),
    damageTypeChoiceApplied: booleanField(state, "qDamageTypeChoiceApplied"),
    damageRiderPresent: booleanField(state, "qDamageRiderPresent"),
    weaponEnhancementBonus: numberFromQuintInt(
      state["qWeaponEnhancementBonus"],
      "qWeaponEnhancementBonus",
    ),
    holes: protocol.holes,
    lastResult: protocol.lastResult,
  };
}

function compareWeaponHostedStates(
  runtime: WeaponHostedState,
  quint: WeaponHostedState,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `${error.message}\nruntime=${JSON.stringify(runtime)}\nquint=${JSON.stringify(quint)}`,
      );
    }
    throw error;
  }
  return true;
}

function requireResolved(
  result: BattleResolutionResult,
  message: string,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  expect(result).toMatchObject({ tag: "resolved" });
  if (result.tag !== "resolved") {
    throw new Error(message);
  }
  return result;
}

function weaponHostedHole(raw: unknown): WeaponHostedHole {
  const tag = quintVariantTag(raw, "WeaponHostedHole");
  if (isWeaponHostedHole(tag)) {
    return tag;
  }
  throw new Error(`Unknown weapon-hosted hole: ${String(raw)}.`);
}

function isWeaponHostedHole(raw: string): raw is WeaponHostedHole {
  return WEAPON_HOSTED_HOLES.some((hole) => hole === raw);
}

function compareWeaponHostedHoles(
  left: WeaponHostedHole,
  right: WeaponHostedHole,
): number {
  return WEAPON_HOSTED_HOLES.indexOf(left) - WEAPON_HOSTED_HOLES.indexOf(right);
}
