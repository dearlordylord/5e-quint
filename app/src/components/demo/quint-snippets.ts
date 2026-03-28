// Quint spec snippets for the demo spec mirror panel.
// Extracted from dnd.qnt — Fighter/Champion pure functions.

export interface QuintSnippet {
  readonly name: string
  readonly label: string
  readonly source: string
  readonly touchedFields: ReadonlyArray<string>
}

export const SNIPPETS: Record<string, QuintSnippet> = {
  secondWind: {
    name: "pUseSecondWind",
    label: "Second Wind",
    source: `/// Can use Second Wind: charges > 0, bonus action available,
/// not incapacitated, not dead.
pure def canUseSecondWind(fs: FighterState, ts: TurnState,
                          s: CreatureState): bool = {
  fs.secondWindCharges > 0
    and not(ts.bonusActionUsed)
    and not(isIncapacitated(s))
    and not(s.dead)
}

/// Use Second Wind: heal d10 + level via pHeal, decrement charge.
pure def pUseSecondWind(s: CreatureState, fs: FighterState,
                        d10Roll: int, fighterLevel: int)
    : { creature: CreatureState, fighter: FighterState } = {
  val healAmount = d10Roll + fighterLevel
  {
    creature: pHeal(s, healAmount),
    fighter: fs.with("secondWindCharges",
                     fs.secondWindCharges - 1),
  }
}`,
    touchedFields: ["hp", "secondWindCharges"]
  },

  actionSurge: {
    name: "pUseActionSurge",
    label: "Action Surge",
    source: `/// Can use Action Surge: charges > 0, not used this turn,
/// not incapacitated.
pure def canUseActionSurge(fs: FighterState,
                           s: CreatureState): bool = {
  fs.actionSurgeCharges > 0
    and not(fs.actionSurgeUsedThisTurn)
    and not(isIncapacitated(s))
}

/// Use Action Surge: grant +1 action, decrement charge, mark used.
pure def pUseActionSurge(ts: TurnState, fs: FighterState)
    : { turn: TurnState, fighter: FighterState } = {
  {
    turn: ts.with("actionsRemaining",
                  ts.actionsRemaining + 1),
    fighter: fs.with("actionSurgeCharges",
                     fs.actionSurgeCharges - 1)
              .with("actionSurgeUsedThisTurn", true),
  }
}`,
    touchedFields: ["actionsRemaining", "actionSurgeCharges", "actionSurgeUsedThisTurn"]
  },

  tacticalMind: {
    name: "pUseTacticalMind",
    label: "Tactical Mind",
    source: `/// Can use Tactical Mind: level >= 2 and
/// Second Wind charges > 0 (SRD 5.2.1).
pure def canUseTacticalMind(fighterLevel: int,
                            fs: FighterState): bool = {
  fighterLevel >= 2 and fs.secondWindCharges > 0
}

/// Tactical Mind: expend a Second Wind use on a failed
/// ability check to add 1d10.
/// Charge is only consumed if the boosted check succeeds.
pure def pUseTacticalMind(fs: FighterState,
                          boostedCheckSucceeds: bool)
    : FighterState = {
  if (boostedCheckSucceeds)
    fs.with("secondWindCharges",
            fs.secondWindCharges - 1)
  else fs
}`,
    touchedFields: ["secondWindCharges"]
  },

  indomitable: {
    name: "pUseIndomitable",
    label: "Indomitable",
    source: `/// Can use Indomitable: level >= 9 and charges > 0.
pure def canUseIndomitable(fighterLevel: int,
                           fs: FighterState): bool = {
  fighterLevel >= 9 and fs.indomitableCharges > 0
}

/// Use Indomitable: decrement charge (caller handles reroll).
pure def pUseIndomitable(fs: FighterState): FighterState = {
  fs.with("indomitableCharges",
          fs.indomitableCharges - 1)
}`,
    touchedFields: ["indomitableCharges"]
  },

  startTurn: {
    name: "pFighterStartTurn",
    label: "Start Turn",
    source: `/// Fighter start of turn: reset actionSurgeUsedThisTurn flag.
/// Heroic Warrior (Champion L10): gain Heroic Inspiration
/// if you don't have it.
pure def pFighterStartTurn(fs: FighterState,
                           fighterLevel: int)
    : FighterState = {
  val fs1 = fs.with("actionSurgeUsedThisTurn", false)
  // Heroic Warrior (Champion L10)
  if (fighterLevel >= 10 and not(fs1.heroicInspiration))
    fs1.with("heroicInspiration", true)
  else fs1
}`,
    touchedFields: ["actionSurgeUsedThisTurn", "heroicInspiration"]
  },

  shortRest: {
    name: "pFighterShortRest",
    label: "Short Rest",
    source: `/// Fighter short rest: regain 1 SW charge (capped),
/// restore all AS charges.
pure def pFighterShortRest(fs: FighterState)
    : FighterState = {
  fs.with("secondWindCharges",
          intMin(fs.secondWindCharges + 1,
                 fs.secondWindMax))
    .with("actionSurgeCharges", fs.actionSurgeMax)
}`,
    touchedFields: ["secondWindCharges", "actionSurgeCharges"]
  },

  longRest: {
    name: "pFighterLongRest",
    label: "Long Rest",
    source: `/// Fighter long rest: restore all charges to max.
pure def pFighterLongRest(fs: FighterState)
    : FighterState = {
  fs.with("secondWindCharges", fs.secondWindMax)
    .with("actionSurgeCharges", fs.actionSurgeMax)
    .with("indomitableCharges", fs.indomitableMax)
}`,
    touchedFields: ["secondWindCharges", "actionSurgeCharges", "indomitableCharges"]
  },

  critRange: {
    name: "configForLevel (critRange)",
    label: "Improved / Superior Critical",
    source: `/// Derive full CharConfig from level. Level-dependent fields:
/// critRange (Champion Improved/Superior Critical)
pure def configForLevel(level: int): CharConfig = {
  // ...
  val cr = if (level >= 15) 18     // Superior Critical
    else if (level >= 3) 19        // Improved Critical
    else 20
  BASE_CHAMPION_CONFIG
    .with("critRange", cr)
  // ...
}`,
    touchedFields: ["critRange"]
  },

  heroicRally: {
    name: "pHeroicRally",
    label: "Heroic Rally (Survivor)",
    source: `/// Bloodied: at or below half max HP AND has at least 1 HP.
pure def isBloodied(s: CreatureState): bool = {
  s.hp > 0 and s.hp <= s.maxHp / 2
}

/// Heroic Rally (Champion L18): heal 5 + conMod at start
/// of turn if Bloodied.
pure def pHeroicRally(s: CreatureState,
                      fighterLevel: int,
                      conMod: int): CreatureState = {
  if (fighterLevel >= 18 and isBloodied(s))
    pHeal(s, 5 + conMod)
  else s
}`,
    touchedFields: ["hp"]
  },

  remarkableAthlete: {
    name: "doScoreCriticalHit",
    label: "Remarkable Athlete",
    source: `/// Remarkable Athlete: after scoring a Critical Hit,
/// move up to half Speed without OAs.
/// SRD 5.2.1 Champion L3: "immediately after you score
/// a Critical Hit, you can move up to half your Speed
/// without provoking Opportunity Attacks."
action doScoreCriticalHit = {
  if (turnPhase != "acting"
      or fighterLevel < 3
      or isIncapacitated(state)) unchanged
  else all {
    state' = state,
    turnState' = pGrantBonusMovement(
      turnState, turnState.effectiveSpeed, true),
    // ...
  }
}`,
    touchedFields: ["bonusMovementRemaining", "bonusMovementOAFree"]
  },
  // --- Core actions (not Fighter-specific) ---

  takeDamage: {
    name: "pTakeDamage",
    label: "Take Damage",
    source: `pure def pTakeDamage(
  s: CreatureState, amount: int, damageType: DamageType,
  resistances: Set[DamageType], vulnerabilities: Set[DamageType],
  immunities: Set[DamageType], isCritical: bool
): CreatureState = {
  if (s.dead) s
  else {
    val effMax = effectiveMaxHp(s)
    val effResist = if (s.petrified) ALL_DAMAGE_TYPES else resistances
    val effAmount = applyDamageModifiers(amount, damageType,
                      immunities, effResist, vulnerabilities, 0)
    if (effAmount <= 0) s
    else {
      val tempAbsorb = intMin(s.tempHp, effAmount)
      val dmgThrough = effAmount - tempAbsorb
      val s1 = s.with("tempHp", s.tempHp - tempAbsorb)
      if (dmgThrough == 0) s1
      else if (s1.hp == 0) {
        if (dmgThrough >= effMax) s1.with("dead", true)
        else pAddDeathFailures(s1.with("stable", false),
               if (isCritical) 2 else 1)
      } else {
        val newHp = s1.hp - dmgThrough
        if (newHp <= 0) {
          val overflow = -newHp
          val s2 = s1.with("hp", 0)
          if (overflow >= effMax) s2.with("dead", true)
          else pApplyCondition(s2, CUnconscious)
        } else s1.with("hp", newHp)
      }
    }
  }
}`,
    touchedFields: ["hp", "tempHp", "dead", "unconscious", "prone", "deathSavesFailures", "stable"]
  },

  deathSave: {
    name: "pDeathSave",
    label: "Death Save",
    source: `/// Nat 20: regain 1 HP + consciousness. Nat 1: two failures.
/// 3 successes: stable. 3 failures: dead.
pure def pDeathSave(s: CreatureState, d20Roll: int): CreatureState = {
  if (s.dead or s.hp > 0 or s.stable) s
  else if (d20Roll == 20) {
    pRemoveCondition(
      s.with("hp", 1).with("deathSaves", DEATH_SAVES_RESET),
      CUnconscious
    )
  } else if (d20Roll == 1) {
    pAddDeathFailures(s, 2)
  } else if (d20Roll >= 10) {
    val newSucc = s.deathSaves.successes + 1
    if (newSucc >= 3)
      s.with("stable", true).with("deathSaves", DEATH_SAVES_RESET)
    else
      s.with("deathSaves", { successes: newSucc,
                              failures: s.deathSaves.failures })
  } else {
    pAddDeathFailures(s, 1)
  }
}`,
    touchedFields: ["hp", "deathSavesSuccesses", "deathSavesFailures", "stable", "dead", "unconscious"]
  },

  useAction: {
    name: "pUseAction",
    label: "Use Action",
    source: `pure def pUseAction(t: TurnState, creature: CreatureState,
                     actionType: ActionType): TurnState = {
  if (t.actionsRemaining <= 0 or isIncapacitated(creature)) t
  else {
    val t1 = t.with("actionsRemaining", t.actionsRemaining - 1)
    match actionType {
      | AAttack => t1.with("attackActionUsed", true)
      | ADisengage => t1.with("disengaged", true)
      | ADodge => t1.with("dodging", true)
      | ADash => t1.with("movementRemaining",
                         t1.movementRemaining + t1.effectiveSpeed)
      | AReady => t1.with("readiedAction", true)
      | _ => t1
    }
  }
}`,
    touchedFields: [
      "actionsRemaining",
      "attackActionUsed",
      "disengaged",
      "dodging",
      "movementRemaining",
      "readiedAction"
    ]
  },

  useMovement: {
    name: "pUseMovement",
    label: "Use Movement",
    source: `/// Spend movement. feet = distance, movementCost = multiplier
/// (1 = normal, 2 = difficult terrain). No change if insufficient.
pure def pUseMovement(t: TurnState, feet: int,
                      movementCost: int): TurnState = {
  val cost = feet * movementCost
  if (cost > t.movementRemaining or cost < 0) t
  else t.with("movementRemaining", t.movementRemaining - cost)
}`,
    touchedFields: ["movementRemaining"]
  },

  useExtraAttack: {
    name: "pUseExtraAttack",
    label: "Extra Attack",
    source: `/// Use one extra attack within the Attack action.
pure def pUseExtraAttack(t: TurnState): TurnState = {
  if (t.extraAttacksRemaining <= 0) t
  else t.with("extraAttacksRemaining",
              t.extraAttacksRemaining - 1)
}`,
    touchedFields: ["extraAttacksRemaining"]
  },

  enterCombat: {
    name: "doEnterCombat",
    label: "Enter Combat",
    source: `/// Transition from outOfCombat to waitingForTurn.
action doEnterCombat = {
  if (turnPhase != "outOfCombat") unchanged
  else all {
    turnPhase' = "waitingForTurn",
    // all other vars unchanged
  }
}`,
    touchedFields: ["turnPhase"]
  },

  endTurn: {
    name: "pEndTurn",
    label: "End Turn",
    source: `/// End of turn: process saves, damage, expire effects.
pure def pEndTurn(
  s: CreatureState, ss: SpellSlotState,
  saves: List[EndOfTurnSave],
  damages: List[EndOfTurnDamage]
): ConcBreakResult = {
  val s1 = pProcessEndOfTurnSaves(s, saves)
  val r = pProcessEndOfTurnDamage(s1, ss, damages)
  val cleaned = pClearExpiredAtPhase(
                  r.creature.activeEffects, AtEndOfTurn)
  { creature: r.creature.with("activeEffects", cleaned),
    slots: r.slots }
}`,
    touchedFields: ["hp", "activeEffects", "concentrationSpellId"]
  },

  heal: {
    name: "pHeal",
    label: "Heal",
    source: `/// Heal. Caps at effectiveMaxHp. At 0 HP: regain
/// consciousness, reset death saves.
pure def pHeal(s: CreatureState, amount: int): CreatureState = {
  if (s.dead or amount <= 0) s
  else {
    val effMax = effectiveMaxHp(s)
    val newHp = intMin(s.hp + amount, effMax)
    val s1 = s.with("hp", newHp)
    if (s.hp == 0 and newHp > 0)
      pRemoveCondition(s1, CUnconscious)
        .with("deathSaves", DEATH_SAVES_RESET)
        .with("stable", false)
    else s1
  }
}`,
    touchedFields: ["hp", "unconscious", "deathSavesSuccesses", "deathSavesFailures", "stable"]
  },
  standFromProne: {
    name: "pStandFromProne",
    label: "Stand from Prone",
    source: `/// Standing from prone costs half your speed.
pure def pSpendHalfSpeed(t: TurnState): TurnState = {
  val cost = t.effectiveSpeed / 2
  if (t.effectiveSpeed == 0 or cost > t.movementRemaining) t
  else t.with("movementRemaining", t.movementRemaining - cost)
}

pure def pStandFromProne(t: TurnState): TurnState =
  pSpendHalfSpeed(t)`,
    touchedFields: ["movementRemaining"]
  },

  exitCombat: {
    name: "doExitCombat",
    label: "Exit Combat",
    source: `/// Transition to outOfCombat (from acting or waitingForTurn).
action doExitCombat = {
  if (turnPhase == "outOfCombat") unchanged
  else all {
    turnPhase' = "outOfCombat",
    // all other vars unchanged
  }
}`,
    touchedFields: ["turnPhase"]
  }
} as const
