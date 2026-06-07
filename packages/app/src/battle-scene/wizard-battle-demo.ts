/* eslint-disable max-lines */
import {
  battleCombatantSide,
  type BattleCreatureInit,
  type BattleHole,
  battleId,
  battleObjectId,
  type BattleObjectIgnitionOutcome,
  type BattleResolutionResult,
  type BattleSnapshot,
  type BattleState,
  characterId,
  type CombatantId,
  combatantId,
  endTurn,
  initiativeScore,
  resolveBattleInterrupt,
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
  deathSavingThrowFill,
  declineInterruptDecision,
  fireballSavingThrowOutcomeFill,
  interruptDecisionFill,
  requireActionSpellAct,
  requireCounterspellChoice,
  requireHole,
  requireNeedsHoles,
  requireNeedsReaction,
  requireResultHole,
  shatterSavingThrowOutcomeFill,
  spellCastReactionFactsFill
} from "./wizard-battle-demo-runtime.ts"

const fireballUnitId = "fireball"
const counterspellUnitId = "counterspell"
const shatterUnitId = "shatter"
const fireballSlotLevel = 3
const counterspellSlotLevel = 3
const shatterSlotLevel = 2
const counterspellRangeFeet = 60
const wizardWalkFeet = 30
const wizardHp = 50
const unarmedStrikeAttackBonus = 2
const wizardSpellcastingAbilityModifier = 4
const wizardProficiencyBonus = 3
const fireballDamageRollResults = [4, 4, 4, 4, 3, 3, 3, 3] as const
const shatterDamageRollResults = [5, 5, 4] as const
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
    readonly name: "Fireball" | "Counterspell" | "Shatter"
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
  readonly levelTwoSlots: number
  readonly levelThreeSlots: number
  readonly gridPosition: BattleGridPosition
  readonly spriteFile: number
}

type CounterspellChainLink = {
  readonly reactorId: CombatantId
  readonly interruptedCasterId: CombatantId
  readonly waitingDetail: string
  readonly castDetail: string
}

type ReadonlyNonEmptyArray<T> = readonly [T, ...ReadonlyArray<T>]

type SpellSaveOutcome = {
  readonly targetId: CombatantId
  readonly succeeded: boolean
  readonly label: string
  readonly detail: string
}

type AreaSpellDefinition =
  | {
      readonly kind: "fireball"
      readonly id: typeof fireballUnitId
      readonly name: "Fireball"
      readonly slotLevel: typeof fireballSlotLevel
      readonly areaRadiusFeet: 20
      readonly color: "#f97316"
      readonly damageRollResults: typeof fireballDamageRollResults
    }
  | {
      readonly kind: "shatter"
      readonly id: typeof shatterUnitId
      readonly name: "Shatter"
      readonly slotLevel: typeof shatterSlotLevel
      readonly areaRadiusFeet: 10
      readonly color: "#38bdf8"
      readonly damageRollResults: typeof shatterDamageRollResults
    }

type SpellCastReactionPlan =
  | { readonly kind: "none" }
  | {
      readonly kind: "counterspellChain"
      readonly chain: ReadonlyNonEmptyArray<CounterspellChainLink>
    }
  | {
      readonly kind: "declinedCounterspell"
      readonly reactorId: CombatantId
      readonly detail: string
    }

type AreaSpellPlan = {
  readonly spell: AreaSpellDefinition
  readonly casterId: CombatantId
  readonly title: string
  readonly detail: string
  readonly areaCenter: BattleGridPosition
  readonly outcomes: ReadonlyNonEmptyArray<SpellSaveOutcome>
  readonly reaction: SpellCastReactionPlan
}

type WizardBattleDemoBuilder = {
  state: BattleState
  startedTurnActorId: CombatantId | undefined
  readonly steps: Array<WizardBattleDemoStep>
  readonly objectIgnitions: Array<BattleObjectIgnitionOutcome>
}

const WIZARD_BATTLE_DEMO_COMBATANTS = [
  {
    combatantId: laserWizardId,
    name: "Laser Wizard",
    team: "blue",
    initiative: 20,
    preparedSpellIds: [fireballUnitId],
    levelTwoSlots: 0,
    levelThreeSlots: 2,
    gridPosition: { row: 3, col: 2 },
    spriteFile: 5
  },
  {
    combatantId: mudScampId,
    name: "Mud Scamp",
    team: "red",
    initiative: 18,
    preparedSpellIds: [fireballUnitId],
    levelTwoSlots: 0,
    levelThreeSlots: 2,
    gridPosition: { row: 3, col: 8 },
    spriteFile: 4
  },
  {
    combatantId: forestWizardId,
    name: "Forest Wizard",
    team: "blue",
    initiative: 16,
    preparedSpellIds: [fireballUnitId, counterspellUnitId],
    levelTwoSlots: 0,
    levelThreeSlots: 2,
    gridPosition: { row: 5, col: 2 },
    spriteFile: 1
  },
  {
    combatantId: grayElfId,
    name: "Gray Elf",
    team: "red",
    initiative: 14,
    preparedSpellIds: [shatterUnitId, counterspellUnitId],
    levelTwoSlots: 2,
    levelThreeSlots: 2,
    gridPosition: { row: 5, col: 8 },
    spriteFile: 2
  },
  {
    combatantId: bufoId,
    name: "Bufo",
    team: "blue",
    initiative: 12,
    preparedSpellIds: [fireballUnitId, counterspellUnitId],
    levelTwoSlots: 0,
    levelThreeSlots: 3,
    gridPosition: { row: 7, col: 2 },
    spriteFile: 3
  },
  {
    combatantId: ritualWizardId,
    name: "Ritual Wizard",
    team: "red",
    initiative: 10,
    preparedSpellIds: [fireballUnitId, counterspellUnitId],
    levelTwoSlots: 0,
    levelThreeSlots: 2,
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
] as const satisfies ReadonlyNonEmptyArray<CounterspellChainLink>

const fireballSpellDefinition = {
  kind: "fireball",
  id: fireballUnitId,
  name: "Fireball",
  slotLevel: fireballSlotLevel,
  areaRadiusFeet: 20,
  color: "#f97316",
  damageRollResults: fireballDamageRollResults
} as const satisfies AreaSpellDefinition

const shatterSpellDefinition = {
  kind: "shatter",
  id: shatterUnitId,
  name: "Shatter",
  slotLevel: shatterSlotLevel,
  areaRadiusFeet: 10,
  color: "#38bdf8",
  damageRollResults: shatterDamageRollResults
} as const satisfies AreaSpellDefinition

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
  const shatter = requireSpellRecord(shatterUnitId)
  const builder: WizardBattleDemoBuilder = {
    state: requireInitialState({
      [counterspellUnitId]: counterspell,
      [fireballUnitId]: fireball,
      [shatterUnitId]: shatter
    }),
    startedTurnActorId: undefined,
    steps: [],
    objectIgnitions: []
  }

  pushStep(builder, {
    title: "Battle joined",
    detail: "Six wizards hold formation across the chamber.",
    cue: {}
  })

  castAreaSpell(builder, openingFireballPlan())
  passCurrentTurn(builder, laserWizardId, "Laser Wizard ends the opening turn.")
  castAreaSpell(builder, mudScampFireballPlan())
  passCurrentTurn(builder, mudScampId, "Mud Scamp ends the answering turn.")
  passCurrentTurn(builder, forestWizardId, "Forest Wizard keeps position after the first exchange.")
  castAreaSpell(builder, grayElfFirstShatterPlan())
  passCurrentTurn(builder, grayElfId, "Gray Elf leaves the blue line ringing.")
  passCurrentTurn(builder, bufoId, "Bufo holds the last blue reaction for the next Fireball.")
  passCurrentTurn(builder, ritualWizardId, "Ritual Wizard waits behind the red line.")

  castAreaSpell(builder, secondLaserFireballPlan())
  passCurrentTurn(builder, laserWizardId, "Laser Wizard's second Fireball drops Mud Scamp and Ritual Wizard.", {
    roll: 5,
    targetId: mudScampId
  })
  passCurrentTurn(builder, mudScampId, "Mud Scamp is dying and cannot act.")
  passCurrentTurn(builder, forestWizardId, "Forest Wizard is battered but still on his feet.")
  castAreaSpell(builder, grayElfSecondShatterPlan())
  passCurrentTurn(builder, grayElfId, "Gray Elf's second Shatter knocks Forest Wizard out.")
  castAreaSpell(builder, bufoFireballPlan())
  passCurrentTurn(builder, bufoId, "Bufo ends the last damaging turn.", {
    roll: 5,
    targetId: ritualWizardId
  })
  passCurrentTurn(builder, ritualWizardId, "Ritual Wizard is dying and cannot act.")

  passCurrentTurn(builder, laserWizardId, "Laser Wizard survives at the edge of the blast pattern.", {
    roll: 4,
    targetId: mudScampId
  })
  passCurrentTurn(builder, mudScampId, "Mud Scamp is dead.", { roll: 12, targetId: forestWizardId })
  passCurrentTurn(builder, forestWizardId, "Forest Wizard clings to life.", { roll: 8, targetId: grayElfId })
  passCurrentTurn(builder, grayElfId, "Gray Elf starts making death saving throws.")
  passCurrentTurn(builder, bufoId, "Bufo keeps the field while the others bleed out.", {
    roll: 14,
    targetId: ritualWizardId
  })
  passCurrentTurn(builder, ritualWizardId, "Ritual Wizard has two failures and one success.")

  passCurrentTurn(builder, laserWizardId, "Laser Wizard passes again.")
  passCurrentTurn(builder, mudScampId, "Mud Scamp remains dead.", { roll: 1, targetId: forestWizardId })
  passCurrentTurn(builder, forestWizardId, "Forest Wizard rolls a natural 1 and takes two failures.", {
    roll: 15,
    targetId: grayElfId
  })
  passCurrentTurn(builder, grayElfId, "Gray Elf balances a success against a failure.")
  passCurrentTurn(builder, bufoId, "Bufo lets the round advance.", { roll: 11, targetId: ritualWizardId })
  passCurrentTurn(builder, ritualWizardId, "Ritual Wizard is one success away from stability.")

  passCurrentTurn(builder, laserWizardId, "Laser Wizard passes while the field collapses.")
  passCurrentTurn(builder, mudScampId, "Mud Scamp remains dead.", { roll: 3, targetId: forestWizardId })
  passCurrentTurn(builder, forestWizardId, "Forest Wizard dies on his third failed death saving throw.", {
    roll: 14,
    targetId: grayElfId
  })
  passCurrentTurn(builder, grayElfId, "Gray Elf reaches two death save successes.")
  passCurrentTurn(builder, bufoId, "Bufo watches Ritual Wizard's last death save.", {
    roll: 15,
    targetId: ritualWizardId
  })
  passCurrentTurn(builder, ritualWizardId, "Ritual Wizard becomes stable.")

  passCurrentTurn(builder, laserWizardId, "Laser Wizard passes the final active turn.")
  passCurrentTurn(builder, mudScampId, "Mud Scamp remains dead.")
  passCurrentTurn(builder, forestWizardId, "Forest Wizard remains dead.", { roll: 12, targetId: grayElfId })

  return {
    steps: requireNonEmptySteps(builder.steps),
    objectIgnitions: builder.objectIgnitions
  }
}

function openingFireballPlan(): AreaSpellPlan {
  return fireballPlan({
    casterId: laserWizardId,
    title: "Fireball",
    detail: "Laser Wizard casts Fireball into the opposing line.",
    areaCenter: { row: 5, col: 8 },
    reaction: { kind: "counterspellChain", chain: counterspellChain },
    outcomes: [
      { targetId: mudScampId, succeeded: false, label: "-28", detail: "Mud Scamp fails the Dexterity save." },
      { targetId: grayElfId, succeeded: true, label: "-14", detail: "Gray Elf succeeds and takes half damage." },
      { targetId: ritualWizardId, succeeded: false, label: "-28", detail: "Ritual Wizard fails the Dexterity save." }
    ]
  })
}

function mudScampFireballPlan(): AreaSpellPlan {
  return fireballPlan({
    casterId: mudScampId,
    title: "Fireball",
    detail: "Mud Scamp answers with Fireball into the blue line.",
    areaCenter: { row: 5, col: 2 },
    outcomes: [
      {
        targetId: laserWizardId,
        succeeded: true,
        label: "-14",
        detail: "Laser Wizard succeeds and takes half damage."
      },
      { targetId: forestWizardId, succeeded: false, label: "-28", detail: "Forest Wizard fails the Dexterity save." },
      { targetId: bufoId, succeeded: false, label: "-28", detail: "Bufo fails the Dexterity save." }
    ]
  })
}

function grayElfFirstShatterPlan(): AreaSpellPlan {
  return shatterPlan({
    title: "Shatter",
    detail: "Gray Elf catches Laser Wizard and Forest Wizard in Shatter.",
    reaction: {
      kind: "declinedCounterspell",
      reactorId: forestWizardId,
      detail: "Forest Wizard can answer with Counterspell but holds the slot for the next Fireball."
    },
    outcomes: [
      { targetId: laserWizardId, succeeded: false, label: "-14", detail: "Laser Wizard fails the Constitution save." },
      { targetId: forestWizardId, succeeded: false, label: "-14", detail: "Forest Wizard fails the Constitution save." }
    ]
  })
}

function secondLaserFireballPlan(): AreaSpellPlan {
  return fireballPlan({
    casterId: laserWizardId,
    title: "Fireball",
    detail: "Laser Wizard spends another slot on the red line.",
    areaCenter: { row: 5, col: 8 },
    reaction: { kind: "counterspellChain", chain: counterspellChain },
    outcomes: [
      { targetId: mudScampId, succeeded: false, label: "0 HP", detail: "Mud Scamp fails and drops to 0 HP." },
      { targetId: grayElfId, succeeded: true, label: "-14", detail: "Gray Elf succeeds and takes half damage." },
      { targetId: ritualWizardId, succeeded: false, label: "0 HP", detail: "Ritual Wizard fails and drops to 0 HP." }
    ]
  })
}

function grayElfSecondShatterPlan(): AreaSpellPlan {
  return shatterPlan({
    title: "Shatter",
    detail: "Gray Elf casts Shatter again at the wounded blue wizards.",
    outcomes: [
      { targetId: laserWizardId, succeeded: false, label: "-14", detail: "Laser Wizard fails and barely stays up." },
      { targetId: forestWizardId, succeeded: false, label: "0 HP", detail: "Forest Wizard fails and drops to 0 HP." }
    ]
  })
}

function bufoFireballPlan(): AreaSpellPlan {
  return fireballPlan({
    casterId: bufoId,
    title: "Fireball",
    detail: "Bufo launches the last Fireball into the red line.",
    areaCenter: { row: 5, col: 8 },
    outcomes: [
      { targetId: mudScampId, succeeded: false, label: "+1 fail", detail: "Mud Scamp is unconscious and fails." },
      { targetId: grayElfId, succeeded: false, label: "0 HP", detail: "Gray Elf fails and drops to 0 HP." },
      {
        targetId: ritualWizardId,
        succeeded: false,
        label: "+1 fail",
        detail: "Ritual Wizard is unconscious and fails."
      }
    ]
  })
}

function fireballPlan(
  input: Pick<AreaSpellPlan, "areaCenter" | "casterId" | "detail" | "outcomes" | "title"> & {
    readonly reaction?: SpellCastReactionPlan
  }
): AreaSpellPlan {
  return {
    ...input,
    reaction: input.reaction ?? { kind: "none" },
    spell: fireballSpellDefinition
  }
}

function shatterPlan(
  input: Pick<AreaSpellPlan, "detail" | "outcomes" | "title"> & {
    readonly reaction?: SpellCastReactionPlan
  }
): AreaSpellPlan {
  return {
    ...input,
    areaCenter: { row: 4, col: 2 },
    casterId: grayElfId,
    reaction: input.reaction ?? { kind: "none" },
    spell: shatterSpellDefinition
  }
}

function castAreaSpell(builder: WizardBattleDemoBuilder, plan: AreaSpellPlan): void {
  ensureTurnStarted(builder, plan.casterId)
  requireCurrentActor(builder.state, plan.casterId)
  const act = requireActionSpellAct(builder.state, plan.spell.id, plan.spell.slotLevel)
  pushStep(builder, {
    title: plan.title,
    detail: plan.detail,
    cue: { spell: spellCue(plan) }
  })
  pushStep(builder, {
    title: "Reaction facts",
    detail: counterspellFactsDetail(plan),
    cue: { spell: spellCue(plan) }
  })

  const pending = resolveBattleSubject({
    state: builder.state,
    subject: act.subject,
    fills: [spellCastReactionFactsFill(counterspellFactsForPlan(plan))]
  })
  const spellReady = resolveSpellCastWindows(builder, plan, pending)

  pushStep(builder, {
    title: "Area selected",
    detail: `${plan.spell.name} catches ${plan.outcomes.map((outcome) => nameOf(outcome.targetId)).join(", ")}.`,
    state: spellReady.state,
    cue: { spell: spellCue(plan) }
  })
  pushStep(builder, {
    title: `${plan.spell.name} saves`,
    detail: `${plan.spell.name} asks the table for affected creatures and Saving Throw outcomes.`,
    state: spellReady.state,
    cue: { spell: spellCue(plan) }
  })

  for (const outcome of plan.outcomes) {
    pushStep(builder, {
      title: "Saving throw",
      detail: outcome.detail,
      state: spellReady.state,
      cue: {
        spell: spellCue(plan),
        labels: [
          {
            combatantId: outcome.targetId,
            text: outcome.succeeded ? "Save" : "Fail",
            tone: outcome.succeeded ? "positive" : "negative"
          }
        ]
      }
    })
  }

  const savingThrow = requireHole(spellReady.holes, "savingThrowOutcome")
  const saveFill = savingThrowFillForPlan(savingThrow, plan)
  const damageRoll = requireResultHole(
    resolveBattleSubject({
      state: spellReady.state,
      subject: spellReady.subject,
      fills: [saveFill]
    }),
    "rolledDice"
  )
  pushStep(builder, {
    title: "Damage roll",
    detail: `${plan.spell.name} rolls ${plan.spell.damageRollResults.join(" + ")}.`,
    state: spellReady.state,
    cue: { spell: spellCue(plan) }
  })

  const resolved = resolveBattleSubject({
    state: spellReady.state,
    subject: spellReady.subject,
    fills: [saveFill, damageRollFillWithGroups(damageRoll, [plan.spell.damageRollResults])]
  })
  if (resolved.tag !== "resolved") {
    throw new Error(`Expected ${plan.spell.name} to resolve, got ${resolved.tag}.`)
  }
  builder.state = resolved.state
  builder.objectIgnitions.push(...(resolved.objectIgnitions ?? []))

  pushStep(builder, {
    title: "Damage",
    detail: damageSummary(plan),
    cue: {
      spell: spellCue(plan),
      damagedCombatantIds: plan.outcomes.map((outcome) => outcome.targetId),
      labels: plan.outcomes.map((outcome) => ({
        combatantId: outcome.targetId,
        text: outcome.label,
        tone: outcome.succeeded ? "positive" : "negative"
      })),
      objectIgnitions: resolved.objectIgnitions ?? []
    }
  })
}

function resolveSpellCastWindows(
  builder: WizardBattleDemoBuilder,
  plan: AreaSpellPlan,
  result: BattleResolutionResult
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  if (plan.reaction.kind === "counterspellChain") {
    return resolveCounterspellChain(builder, plan, result, plan.reaction.chain)
  }
  if (plan.reaction.kind === "declinedCounterspell") {
    return resolveDeclinedCounterspell(builder, plan, result, plan.reaction)
  }
  const noReaction: Extract<SpellCastReactionPlan, { readonly kind: "none" }> = plan.reaction
  void noReaction
  requireNeedsHoles(result, `Expected ${plan.spell.name} holes.`)
  return result
}

function resolveCounterspellChain(
  builder: WizardBattleDemoBuilder,
  plan: AreaSpellPlan,
  result: BattleResolutionResult,
  chain: ReadonlyNonEmptyArray<CounterspellChainLink>
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  requireNeedsReaction(result, `Expected ${plan.spell.name} Counterspell window.`)
  let pendingInterrupt = result
  for (const [index, link] of chain.entries()) {
    pushStep(builder, {
      title: "Counterspell window",
      detail: link.waitingDetail,
      state: pendingInterrupt.state,
      cue: {
        reactingId: link.reactorId,
        spell: counterspellCue(link)
      }
    })

    const choice = requireCounterspellChoice(pendingInterrupt, {
      reactorId: link.reactorId,
      slotLevel: counterspellSlotLevel,
      spellId: counterspellUnitId
    })
    const nextLink = chain.at(index + 1)
    const reactionResult = resolveBattleInterrupt({
      state: pendingInterrupt.state,
      fill: interruptDecisionFill(
        requireHole(pendingInterrupt.holes, "interruptDecision"),
        counterspellDecision(
          link.reactorId,
          choice,
          nextLink === undefined
            ? []
            : [spellCastReactionFactsFill([counterspellFactForLink(nextLink, link.reactorId)])]
        )
      )
    })

    if (nextLink === undefined) {
      requireNeedsHoles(reactionResult, `Expected ${plan.spell.name} to resume after Counterspell chain.`)
      pushCounterspellCastStep(builder, link, reactionResult)
      return reactionResult
    }
    requireNeedsReaction(reactionResult, `Expected ${nameOf(nextLink.reactorId)} Counterspell window.`)
    pushCounterspellCastStep(builder, link, reactionResult)
    pendingInterrupt = reactionResult
  }
  throw new Error(`Expected ${plan.spell.name} Counterspell chain to resume.`)
}

function pushCounterspellCastStep(
  builder: WizardBattleDemoBuilder,
  link: CounterspellChainLink,
  result: Extract<BattleResolutionResult, { readonly tag: "needsHoles" }>
): void {
  pushStep(builder, {
    title: "Counterspell",
    detail: link.castDetail,
    state: result.state,
    cue: {
      reactingId: link.reactorId,
      spell: counterspellCue(link),
      labels: [{ combatantId: link.reactorId, text: "Counterspell", tone: "positive" }]
    }
  })
}

function resolveDeclinedCounterspell(
  builder: WizardBattleDemoBuilder,
  plan: AreaSpellPlan,
  result: BattleResolutionResult,
  decline: Extract<SpellCastReactionPlan, { readonly kind: "declinedCounterspell" }>
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  requireNeedsReaction(result, `Expected ${nameOf(decline.reactorId)} Counterspell window.`)
  requireCounterspellChoice(result, {
    reactorId: decline.reactorId,
    slotLevel: counterspellSlotLevel,
    spellId: counterspellUnitId
  })
  pushStep(builder, {
    title: "Counterspell window",
    detail: decline.detail,
    state: result.state,
    cue: {
      reactingId: decline.reactorId,
      spell: {
        name: "Counterspell",
        casterId: decline.reactorId,
        targetId: plan.casterId,
        color: "#8b5cf6"
      }
    }
  })
  const declined = resolveBattleInterrupt({
    state: result.state,
    fill: interruptDecisionFill(
      requireHole(result.holes, "interruptDecision"),
      declineInterruptDecision(decline.reactorId)
    )
  })
  requireNeedsHoles(declined, `Expected ${plan.spell.name} to continue after declined Counterspell.`)
  pushStep(builder, {
    title: "Counterspell declined",
    detail: `${nameOf(decline.reactorId)} declines the reaction.`,
    state: declined.state,
    cue: {
      reactingId: decline.reactorId,
      labels: [{ combatantId: decline.reactorId, text: "Decline", tone: "positive" }]
    }
  })
  return declined
}

function passCurrentTurn(
  builder: WizardBattleDemoBuilder,
  actorId: CombatantId,
  detail: string,
  deathSave?: { readonly roll: number; readonly targetId: CombatantId }
): void {
  ensureTurnStarted(builder, actorId)
  requireCurrentActor(builder.state, actorId)
  pushStep(builder, {
    title: "Turn passes",
    detail,
    cue: {}
  })
  const result = endTurn({ state: builder.state, actorId })
  if (result.tag === "resolved") {
    if (deathSave !== undefined) {
      throw new Error(`Did not receive expected Death Saving Throw for ${nameOf(deathSave.targetId)}.`)
    }
    builder.state = result.state
    builder.startedTurnActorId = undefined
    return
  }
  requireNeedsHoles(result, "Expected End Turn to resolve or ask for a Death Saving Throw.")
  const deathSavingThrow = requireHole(result.holes, "deathSavingThrow")
  if (deathSave === undefined || deathSavingThrow.combatantId !== deathSave.targetId) {
    throw new Error("Unexpected Death Saving Throw hole while advancing the wizard battle demo.")
  }
  const resolved = resolveBattleSubject({
    state: builder.state,
    subject: result.subject,
    fills: [deathSavingThrowFill(deathSavingThrow, deathSave.roll)]
  })
  if (resolved.tag !== "resolved") {
    throw new Error(`Expected Death Saving Throw to resolve, got ${resolved.tag}.`)
  }
  builder.state = resolved.state
  builder.startedTurnActorId = undefined
  ensureTurnStarted(builder, deathSave.targetId)
  pushStep(builder, {
    title: "Death save",
    detail: `${nameOf(deathSave.targetId)} rolls ${deathSave.roll}: ${deathSaveText(deathSave.roll)}.`,
    cue: {
      labels: [
        {
          combatantId: deathSave.targetId,
          text: deathSaveText(deathSave.roll),
          tone: deathSave.roll >= 10 ? "positive" : "negative"
        }
      ]
    }
  })
}

function ensureTurnStarted(builder: WizardBattleDemoBuilder, actorId: CombatantId): void {
  if (builder.startedTurnActorId === actorId) return
  requireCurrentActor(builder.state, actorId)
  pushStep(builder, {
    title: "Turn starts",
    detail: `${nameOf(actorId)} takes the turn.`,
    cue: {}
  })
  builder.startedTurnActorId = actorId
}

function pushStep(
  builder: WizardBattleDemoBuilder,
  input: Omit<WizardBattleDemoStep, "state"> & { readonly state?: BattleState }
): void {
  builder.steps.push({
    ...input,
    state: input.state ?? builder.state
  })
}

function requireCurrentActor(state: BattleState, actorId: CombatantId): void {
  const currentActorId = snapshotBattle(state).currentActorId
  if (currentActorId !== actorId) {
    throw new Error(`Expected current actor ${nameOf(actorId)}, got ${nameOf(currentActorId)}.`)
  }
}

function counterspellFactsForPlan(plan: AreaSpellPlan) {
  if (plan.reaction.kind === "counterspellChain") {
    return [counterspellFactForLink(plan.reaction.chain[0], plan.casterId)]
  }
  if (plan.reaction.kind === "declinedCounterspell") {
    return [
      counterspellTriggerFact({
        reactorId: plan.reaction.reactorId,
        casterId: plan.casterId,
        spellId: counterspellUnitId,
        rangeFeet: counterspellRangeFeet
      })
    ]
  }
  const noReaction: Extract<SpellCastReactionPlan, { readonly kind: "none" }> = plan.reaction
  void noReaction
  return []
}

function counterspellFactsDetail(plan: AreaSpellPlan): string {
  if (plan.reaction.kind === "counterspellChain") {
    const firstCounterspell = plan.reaction.chain[0]
    return `${nameOf(firstCounterspell.reactorId)} is visible within Counterspell range.`
  }
  if (plan.reaction.kind === "declinedCounterspell") {
    return `${nameOf(plan.reaction.reactorId)} is visible within Counterspell range.`
  }
  const noReaction: Extract<SpellCastReactionPlan, { readonly kind: "none" }> = plan.reaction
  void noReaction
  return "The table projection supplies no eligible Counterspell reactor for this casting."
}

function counterspellFactForLink(link: CounterspellChainLink, casterId: CombatantId) {
  return counterspellTriggerFact({
    reactorId: link.reactorId,
    casterId,
    spellId: counterspellUnitId,
    rangeFeet: counterspellRangeFeet
  })
}

function savingThrowFillForPlan(
  savingThrow: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  plan: AreaSpellPlan
) {
  const outcomes = plan.outcomes.map((outcome) => ({
    targetId: outcome.targetId,
    succeeded: outcome.succeeded
  }))
  if (plan.spell.kind === "fireball") {
    return fireballSavingThrowOutcomeFill(savingThrow, {
      originAnchorId: plan.casterId,
      objectId: dryTapestryId,
      outcomes
    })
  }
  const shatterSpell: Extract<AreaSpellDefinition, { readonly kind: "shatter" }> = plan.spell
  void shatterSpell
  return shatterSavingThrowOutcomeFill(savingThrow, {
    originAnchorId: plan.casterId,
    nonmagicalUnattendedObjectDamageFacts: [],
    outcomes
  })
}

function spellCue(plan: AreaSpellPlan): NonNullable<WizardBattleDemoCue["spell"]> {
  return {
    name: plan.spell.name,
    casterId: plan.casterId,
    areaCenter: plan.areaCenter,
    areaRadiusFeet: plan.spell.areaRadiusFeet,
    color: plan.spell.color
  }
}

function counterspellCue(link: CounterspellChainLink): NonNullable<WizardBattleDemoCue["spell"]> {
  return {
    name: "Counterspell",
    casterId: link.reactorId,
    targetId: link.interruptedCasterId,
    color: "#8b5cf6"
  }
}

function damageSummary(plan: AreaSpellPlan): string {
  const failed = plan.outcomes.filter((outcome) => !outcome.succeeded).map((outcome) => nameOf(outcome.targetId))
  const succeeded = plan.outcomes.filter((outcome) => outcome.succeeded).map((outcome) => nameOf(outcome.targetId))
  return [
    failed.length === 0 ? "" : `${failed.join(", ")} fail.`,
    succeeded.length === 0 ? "" : `${succeeded.join(", ")} succeed and take half damage.`
  ]
    .filter(Boolean)
    .join(" ")
}

function deathSaveText(roll: number): string {
  if (roll === 1) return "Nat 1"
  if (roll >= 10) return "Success"
  return "Failure"
}

function requireNonEmptySteps(
  steps: ReadonlyArray<WizardBattleDemoStep>
): readonly [WizardBattleDemoStep, ...Array<WizardBattleDemoStep>] {
  if (steps.length < 1) {
    throw new Error("Wizard battle demo did not produce any steps.")
  }
  const first = steps[0]
  return [first, ...steps.slice(1)]
}

function requireInitialState(spellsById: Readonly<Record<string, SpellRecord>>): BattleState {
  const state = startBattle({
    battleId: battleId("battle:wizard-fireball-counterspell-demo"),
    combatants: WIZARD_BATTLE_DEMO_COMBATANTS.map((combatant) =>
      wizardCreature({
        combatantId: combatant.combatantId,
        displayName: combatant.name,
        initiative: combatant.initiative,
        levelThreeSlots: combatant.levelThreeSlots,
        levelTwoSlots: combatant.levelTwoSlots,
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
  readonly levelThreeSlots: number
  readonly levelTwoSlots: number
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
      d20Statistics: {
        abilityScores: {
          str: 8,
          dex: 14,
          con: 14,
          int: 18,
          wis: 12,
          cha: 10
        },
        savingThrowProficiencies: ["int", "wis"],
        skillProficiencies: ["arcana", "history"],
        skillExpertise: []
      },
      armorClass: defaultArmorClassState(),
      size: "medium",
      knownLanguages: ["Common"],
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
        spellSlots: [
          ...(input.levelTwoSlots === 0 ? [] : [{ spellLevel: shatterSlotLevel, count: input.levelTwoSlots }]),
          ...(input.levelThreeSlots === 0 ? [] : [{ spellLevel: fireballSlotLevel, count: input.levelThreeSlots }])
        ]
      }
    }
  }
}
