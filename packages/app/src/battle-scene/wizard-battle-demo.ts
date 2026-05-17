/* eslint-disable max-lines */
import {
  battleCombatantSide,
  type BattleCreatureInit,
  battleId,
  battleObjectId,
  type BattleObjectIgnitionOutcome,
  type BattleResolutionResult,
  type BattleSnapshot,
  type BattleState,
  characterId,
  type CombatantId,
  combatantId,
  initiativeScore,
  resolveBattleReaction,
  resolveBattleSubject,
  snapshotBattle,
  startBattle
} from "@dnd/battle-runtime"
import { attackBonus, Hp, movementFeet, proficiencyBonus } from "@dnd/shared/types"
import { abilityModifier, defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra"
import type { SpellRecord } from "@dnd/surface/surface/types"
import { buildUnitCatalog, srdUnitCollection } from "@dnd/surface/surface/unit-catalog"
import { Either } from "effect"

import {
  counterspellDecision,
  counterspellTriggerFact,
  damageRollFillWithGroups,
  fireballSavingThrowOutcomeFill,
  reactionDecisionFill,
  requireActionSpellAct,
  requireCounterspellChoice,
  requireHole,
  requireNeedsHoles,
  requireNeedsReaction,
  requireResultHole,
  spellCastReactionFactsFill
} from "./wizard-battle-demo-runtime.ts"

const fireballUnitId = "fireball"
const counterspellUnitId = "counterspell"
const fireballSlotLevel = 3
const counterspellSlotLevel = 3
const counterspellRangeFeet = 60
const wizardWalkFeet = 30
const wizardHp = 50
const unarmedStrikeAttackBonus = 2
const wizardSpellcastingAbilityModifier = 4
const wizardProficiencyBonus = 3
const wizardLevelThreeSpellSlots = 2
const fireballDamageRollResults = [4, 4, 4, 4, 3, 3, 3, 3] as const
const partySide = battleCombatantSide("party")
const oppositionSide = battleCombatantSide("opposition")
const laserWizardId = combatantId("A")
const forestWizardId = combatantId("B")
const bufoId = combatantId("C")
const mudScampId = combatantId("D")
const grayElfId = combatantId("E")
const ritualWizardId = combatantId("F")
const dryTapestryId = battleObjectId("wizard-demo-dry-tapestry")

export type BattleGridPosition = {
  readonly row: number
  readonly col: number
}

export type WizardBattleSprite = {
  readonly url: string
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  readonly imgW: number
  readonly imgH: number
  readonly scale?: number
}

export type WizardBattleCombatantMeta = {
  readonly name: string
  readonly team: "blue" | "red"
  readonly gridPosition: BattleGridPosition
  readonly sprite: WizardBattleSprite
  readonly preparedSpellIds: ReadonlyArray<string>
}

export type WizardBattleDemoMeta = {
  readonly combatants: Readonly<Partial<Record<string, WizardBattleCombatantMeta>>>
  readonly objectNames: Readonly<Partial<Record<string, string>>>
}

export type WizardBattleDemoCue = {
  readonly spell?: {
    readonly name: "Fireball" | "Counterspell"
    readonly casterId: CombatantId
    readonly targetId?: CombatantId
    readonly areaCenter?: BattleGridPosition
    readonly areaRadiusFeet?: number
    readonly color: string
  }
  readonly reactingId?: CombatantId
  readonly damagedCombatantIds?: ReadonlyArray<CombatantId>
  readonly labels?: ReadonlyArray<{
    readonly combatantId: CombatantId
    readonly text: string
    readonly tone: "positive" | "negative"
  }>
  readonly objectIgnitions?: ReadonlyArray<BattleObjectIgnitionOutcome>
}

export type WizardBattleDemoStep = {
  readonly title: string
  readonly detail: string
  readonly state: BattleState
  readonly cue: WizardBattleDemoCue
}

type WizardBattleDemo = {
  readonly steps: readonly [WizardBattleDemoStep, ...Array<WizardBattleDemoStep>]
  readonly objectIgnitions: ReadonlyArray<BattleObjectIgnitionOutcome>
}

type WizardBattleCombatantSpec = {
  readonly combatantId: CombatantId
  readonly name: string
  readonly team: "blue" | "red"
  readonly initiative: number
  readonly preparedSpellIds: ReadonlyArray<string>
  readonly gridPosition: BattleGridPosition
  readonly spriteFile: number
}

type CounterspellChainLink = {
  readonly reactorId: CombatantId
  readonly interruptedCasterId: CombatantId
  readonly waitingDetail: string
  readonly castDetail: string
}

const WIZARD_BATTLE_DEMO_COMBATANTS = [
  {
    combatantId: laserWizardId,
    name: "Laser Wizard",
    team: "blue",
    initiative: 20,
    preparedSpellIds: [fireballUnitId],
    gridPosition: { row: 3, col: 2 },
    spriteFile: 5
  },
  {
    combatantId: mudScampId,
    name: "Mud Scamp",
    team: "red",
    initiative: 18,
    preparedSpellIds: [fireballUnitId],
    gridPosition: { row: 3, col: 8 },
    spriteFile: 4
  },
  {
    combatantId: forestWizardId,
    name: "Forest Wizard",
    team: "blue",
    initiative: 16,
    preparedSpellIds: [fireballUnitId, counterspellUnitId],
    gridPosition: { row: 5, col: 2 },
    spriteFile: 1
  },
  {
    combatantId: grayElfId,
    name: "Gray Elf",
    team: "red",
    initiative: 14,
    preparedSpellIds: [fireballUnitId, counterspellUnitId],
    gridPosition: { row: 5, col: 8 },
    spriteFile: 2
  },
  {
    combatantId: bufoId,
    name: "Bufo",
    team: "blue",
    initiative: 12,
    preparedSpellIds: [fireballUnitId, counterspellUnitId],
    gridPosition: { row: 7, col: 2 },
    spriteFile: 3
  },
  {
    combatantId: ritualWizardId,
    name: "Ritual Wizard",
    team: "red",
    initiative: 10,
    preparedSpellIds: [fireballUnitId, counterspellUnitId],
    gridPosition: { row: 7, col: 8 },
    spriteFile: 6
  }
] as const satisfies ReadonlyArray<WizardBattleCombatantSpec>

const counterspellChain = [
  {
    reactorId: grayElfId,
    interruptedCasterId: laserWizardId,
    waitingDetail: "Gray Elf can see Laser Wizard casting Fireball.",
    castDetail: "Gray Elf casts Counterspell at Laser Wizard's Fireball."
  },
  {
    reactorId: forestWizardId,
    interruptedCasterId: grayElfId,
    waitingDetail: "Forest Wizard can see Gray Elf casting Counterspell.",
    castDetail: "Forest Wizard answers Gray Elf's Counterspell."
  },
  {
    reactorId: ritualWizardId,
    interruptedCasterId: forestWizardId,
    waitingDetail: "Ritual Wizard can see Forest Wizard casting Counterspell.",
    castDetail: "Ritual Wizard tries to break Forest Wizard's Counterspell."
  },
  {
    reactorId: bufoId,
    interruptedCasterId: ritualWizardId,
    waitingDetail: "Bufo can see Ritual Wizard casting Counterspell.",
    castDetail: "Bufo counters Ritual Wizard, clearing the way for Fireball."
  }
] as const satisfies ReadonlyArray<CounterspellChainLink>

const unitCatalog = requireUnitCatalog()
const demo = requireWizardBattleDemo()

export const WIZARD_BATTLE_DEMO_META: WizardBattleDemoMeta = {
  combatants: Object.fromEntries(
    WIZARD_BATTLE_DEMO_COMBATANTS.map((combatant) => [
      combatant.combatantId,
      {
        name: combatant.name,
        team: combatant.team,
        gridPosition: combatant.gridPosition,
        sprite: wizardSprite(combatant.spriteFile),
        preparedSpellIds: combatant.preparedSpellIds
      }
    ])
  ),
  objectNames: {
    [dryTapestryId]: "Dry tapestry"
  }
}

export const WIZARD_BATTLE_DEMO_STEPS = demo.steps
export const WIZARD_BATTLE_DEMO_STATE: BattleState = lastStep(WIZARD_BATTLE_DEMO_STEPS).state
export const WIZARD_BATTLE_DEMO_SNAPSHOT: BattleSnapshot = snapshotBattle(WIZARD_BATTLE_DEMO_STATE)
export const WIZARD_BATTLE_DEMO_OBJECT_IGNITIONS = demo.objectIgnitions

function wizardSprite(file: number): WizardBattleSprite {
  return {
    url: `/sprites/${file}.png`,
    x: 0,
    y: 0,
    w: 64,
    h: 64,
    imgW: 384,
    imgH: 448,
    scale: 1.8
  }
}

function lastStep(steps: readonly [WizardBattleDemoStep, ...Array<WizardBattleDemoStep>]): WizardBattleDemoStep {
  return steps[steps.length - 1]
}

function nameOf(combatantId: CombatantId): string {
  const combatant = WIZARD_BATTLE_DEMO_COMBATANTS.find((candidate) => candidate.combatantId === combatantId)
  return combatant?.name ?? String(combatantId)
}

function requireUnitCatalog() {
  const result = buildUnitCatalog({ collections: [srdUnitCollection] })
  if (result.tag !== "ok") {
    throw new Error("Wizard battle demo SRD Unit catalog is invalid.")
  }
  return result.catalog
}

function requireSpellRecord(unitId: string): SpellRecord {
  const unit = unitCatalog.requireUnit(unitId)
  if (unit.kind !== "spell") {
    throw new Error(`Wizard battle demo Unit is not a spell: ${unitId}`)
  }
  return unit
}

function requireWizardBattleDemo(): WizardBattleDemo {
  const fireball = requireSpellRecord(fireballUnitId)
  const counterspell = requireSpellRecord(counterspellUnitId)
  const state = requireInitialState({ [fireballUnitId]: fireball, [counterspellUnitId]: counterspell })
  const act = requireActionSpellAct(state, fireballUnitId, fireballSlotLevel)
  const steps: Array<WizardBattleDemoStep> = [
    {
      title: "Battle joined",
      detail: "Six wizards hold formation across the chamber.",
      state,
      cue: {}
    },
    {
      title: "Fireball",
      detail: "Laser Wizard casts Fireball into the opposing line.",
      state,
      cue: {
        spell: {
          name: "Fireball",
          casterId: laserWizardId,
          areaCenter: { row: 5, col: 8 },
          areaRadiusFeet: 20,
          color: "#f97316"
        }
      }
    }
  ]

  let pendingReaction = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      spellCastReactionFactsFill([
        counterspellTriggerFact({
          reactorId: counterspellChain[0].reactorId,
          casterId: laserWizardId,
          spellId: counterspellUnitId,
          rangeFeet: counterspellRangeFeet
        })
      ])
    ]
  })
  requireNeedsReaction(pendingReaction, "Expected initial Counterspell window.")

  let resumedFireball: Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> | null = null
  for (const [index, link] of counterspellChain.entries()) {
    steps.push({
      title: "Counterspell window",
      detail: link.waitingDetail,
      state: pendingReaction.state,
      cue: {
        reactingId: link.reactorId,
        spell: {
          name: "Counterspell",
          casterId: link.reactorId,
          targetId: link.interruptedCasterId,
          color: "#8b5cf6"
        }
      }
    })

    const choice = requireCounterspellChoice(pendingReaction, {
      reactorId: link.reactorId,
      slotLevel: counterspellSlotLevel,
      spellId: counterspellUnitId
    })
    const nextLink = counterspellChain.at(index + 1)
    const result = resolveBattleReaction({
      state: pendingReaction.state,
      fill: reactionDecisionFill(
        requireHole(pendingReaction.holes, "reactionDecision"),
        counterspellDecision(
          link.reactorId,
          choice,
          nextLink === undefined
            ? []
            : [
                spellCastReactionFactsFill([
                  counterspellTriggerFact({
                    reactorId: nextLink.reactorId,
                    casterId: link.reactorId,
                    spellId: counterspellUnitId,
                    rangeFeet: counterspellRangeFeet
                  })
                ])
              ]
        )
      )
    })

    steps.push({
      title: "Counterspell",
      detail: link.castDetail,
      state: pendingReaction.state,
      cue: {
        reactingId: link.reactorId,
        spell: {
          name: "Counterspell",
          casterId: link.reactorId,
          targetId: link.interruptedCasterId,
          color: "#8b5cf6"
        },
        labels: [{ combatantId: link.reactorId, text: "Counterspell", tone: "positive" }]
      }
    })

    if (nextLink === undefined) {
      requireNeedsHoles(result, "Expected Fireball to resume after Counterspell chain.")
      resumedFireball = result
    } else {
      requireNeedsReaction(result, `Expected ${nameOf(nextLink.reactorId)} Counterspell window.`)
      pendingReaction = result
    }
  }

  if (resumedFireball === null) {
    throw new Error("Expected Counterspell chain to resume Fireball.")
  }

  steps.push({
    title: "Fireball resumes",
    detail: "The last Counterspell breaks the chain and Fireball reaches the red line.",
    state: resumedFireball.state,
    cue: {
      spell: {
        name: "Fireball",
        casterId: laserWizardId,
        areaCenter: { row: 5, col: 8 },
        areaRadiusFeet: 20,
        color: "#f97316"
      }
    }
  })

  const savingThrow = requireHole(resumedFireball.holes, "savingThrowOutcome")
  const saveFill = fireballSavingThrowOutcomeFill(savingThrow, {
    originAnchorId: laserWizardId,
    objectId: dryTapestryId,
    outcomes: [
      { targetId: mudScampId, succeeded: false },
      { targetId: grayElfId, succeeded: true },
      { targetId: ritualWizardId, succeeded: false }
    ]
  })
  const damageRoll = requireResultHole(
    resolveBattleSubject({
      state: resumedFireball.state,
      subject: resumedFireball.subject,
      fills: [saveFill]
    }),
    "rolledDice"
  )
  const resolved = resolveBattleSubject({
    state: resumedFireball.state,
    subject: resumedFireball.subject,
    fills: [saveFill, damageRollFillWithGroups(damageRoll, [fireballDamageRollResults])]
  })

  if (resolved.tag !== "resolved") {
    throw new Error("Expected wizard battle demo Fireball to resolve.")
  }

  steps.push({
    title: "Damage",
    detail: "Mud Scamp and Ritual Wizard fail the save; Gray Elf twists aside.",
    state: resolved.state,
    cue: {
      spell: {
        name: "Fireball",
        casterId: laserWizardId,
        areaCenter: { row: 5, col: 8 },
        areaRadiusFeet: 20,
        color: "#f97316"
      },
      damagedCombatantIds: [mudScampId, grayElfId, ritualWizardId],
      labels: [
        { combatantId: mudScampId, text: "-28", tone: "negative" },
        { combatantId: grayElfId, text: "Save", tone: "positive" },
        { combatantId: ritualWizardId, text: "-28", tone: "negative" }
      ],
      objectIgnitions: resolved.objectIgnitions ?? []
    }
  })

  return {
    steps: [steps[0], ...steps.slice(1)],
    objectIgnitions: resolved.objectIgnitions ?? []
  }
}

function requireInitialState(spellsById: Readonly<Record<string, SpellRecord>>): BattleState {
  const state = startBattle({
    battleId: battleId("battle:wizard-fireball-counterspell-demo"),
    combatants: WIZARD_BATTLE_DEMO_COMBATANTS.map((combatant) =>
      wizardCreature({
        combatantId: combatant.combatantId,
        displayName: combatant.name,
        initiative: combatant.initiative,
        side: combatant.team === "blue" ? partySide : oppositionSide,
        preparedSpells: combatant.preparedSpellIds.map((spellId) => spellsById[spellId] ?? requireSpellRecord(spellId))
      })
    )
  })
  if (Either.isLeft(state)) {
    throw new Error(`Wizard battle demo fixture is invalid: ${state.left.message}`)
  }
  return state.right
}

function wizardCreature(input: {
  readonly combatantId: CombatantId
  readonly displayName: string
  readonly initiative: number
  readonly side: typeof partySide | typeof oppositionSide
  readonly preparedSpells: ReadonlyArray<SpellRecord>
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: [{ className: "wizard", level: 5 }],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(wizardWalkFeet) },
      currentHp: Hp(wizardHp),
      maxHp: Hp(wizardHp),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 }
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(0),
        attackBonus: attackBonus(unarmedStrikeAttackBonus),
        damageAbilityModifier: abilityModifier(0)
      },
      spellcasting: {
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(wizardSpellcastingAbilityModifier),
        proficiencyBonus: proficiencyBonus(wizardProficiencyBonus),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: input.preparedSpells,
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: fireballSlotLevel, count: wizardLevelThreeSpellSlots }]
      }
    }
  }
}
