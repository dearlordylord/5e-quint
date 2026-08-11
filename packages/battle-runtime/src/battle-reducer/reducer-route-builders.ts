import { battleFillKind } from "../battle-protocol-kinds.ts";
import type { BattleFill, BattleHole } from "../battle-state-execution.ts";
import { battleHoleFamilyKind } from "./hole-helpers.ts";
import type {
  BattleReducerRouteEvent,
  BattleReducerRouteEvents,
  BattleReducerRouteFill,
  BattleReducerRouteHole,
  BattleReducerRouteOwnerGroup,
  BattleReducerRouteSubjectFamily,
} from "./reducer-route-protocol.ts";

export function startBattleRoute(
  owner: BattleReducerRouteOwnerGroup,
): Extract<BattleReducerRouteEvent, { readonly kind: "startBattle" }> {
  return { kind: "startBattle", owner };
}

export function discoverBattleActsRoute<
  const TSubject extends BattleReducerRouteSubjectFamily,
>(
  subject: TSubject,
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): Extract<BattleReducerRouteEvent, { readonly kind: "discoverBattleActs" }> & {
  readonly subject: TSubject;
} {
  return { kind: "discoverBattleActs", subject, holes, owner };
}

export function resolveBattleSubjectWithoutFillRoute<
  const TSubject extends BattleReducerRouteSubjectFamily,
>(
  subject: TSubject,
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): Extract<
  BattleReducerRouteEvent,
  { readonly kind: "resolveBattleSubjectWithoutFill" }
> & { readonly subject: TSubject } {
  return { kind: "resolveBattleSubjectWithoutFill", subject, holes, owner };
}

export function resolveBattleSubjectRoute<
  const TSubject extends BattleReducerRouteSubjectFamily,
>(
  subject: TSubject,
  fill: BattleReducerRouteFill,
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): Extract<
  BattleReducerRouteEvent,
  { readonly kind: "resolveBattleSubject" }
> & {
  readonly subject: TSubject;
} {
  return { kind: "resolveBattleSubject", subject, fill, holes, owner };
}

export function resolveBattleInterruptRoute<
  const TSubject extends BattleReducerRouteSubjectFamily,
>(
  subject: TSubject,
  fill: BattleReducerRouteFill,
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): Extract<
  BattleReducerRouteEvent,
  { readonly kind: "resolveBattleInterrupt" }
> & { readonly subject: TSubject } {
  return { kind: "resolveBattleInterrupt", subject, fill, holes, owner };
}

export function nonEmptyRouteEvents(
  events: readonly BattleReducerRouteEvent[],
): BattleReducerRouteEvents | undefined {
  const [first, ...rest] = events;
  return first === undefined ? undefined : [first, ...rest];
}

export function activeEffectSpellRouteNextDiscoveryOwner(
  holes: readonly BattleReducerRouteHole[],
) {
  if (holes.includes("targetChoice")) return "battleTargetSelection";
  if (holes.includes("attackRoll")) return "battleAttackRoll";
  if (holes.includes("rolledDice")) return "battleHitPoint";
  return "battleSpellSlotAndActionEconomy";
}

export function battleReducerRouteHoles(
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  return [...new Set(holes.flatMap(battleReducerRouteHole))].sort();
}

export function battleReducerRouteHole(
  hole: BattleHole,
): readonly BattleReducerRouteHole[] {
  const family = battleHoleFamilyKind(hole);
  if (family === "abilityCheck") return ["abilityCheck"];
  if (family === "abilityChoice") return ["abilityChoice"];
  if (family === "attackRoll") return ["attackRoll"];
  if (family === "commandOptionChoice") return ["commandOptionChoice"];
  if (family === "concentrationSavingThrow") {
    return ["concentrationSavingThrow"];
  }
  if (family === "damageTypeChoice") return ["damageTypeChoice"];
  if (family === "deathSavingThrow") return ["deathSavingThrow"];
  if (family === "hitPointHealingDistribution") {
    return ["hitPointHealingDistribution"];
  }
  if (family === "interruptDecision") return ["interruptDecision"];
  // Magic Weapon target item identity is caller/table-supplied inventory
  // evidence, not a durable reducer-route frontier.
  if (family === "magicWeaponTargetItem") return [];
  if (family === "movement") return ["movement"];
  if (family === "objectTargetChoice") return ["targetChoice"];
  if (family === "rolledDice") return ["rolledDice"];
  if (family === "sanctuaryInterdictionOutcome") {
    return ["sanctuaryInterdictionOutcome"];
  }
  if (family === "savingThrowOutcome") return ["savingThrowOutcome"];
  if (family === "spellTargetAllocation") return ["spellTargetAllocation"];
  if (family === "spellTargetList") return ["spellTargetList"];
  if (family === "targetChoice") return ["targetChoice"];
  if (family === "unitFeatureDecision") return ["unitFeatureDecision"];
  if (family === "wildShapeEquipmentDisposition") {
    return ["wildShapeEquipmentDisposition"];
  }
  return [];
}

export function battleReducerRouteFill(
  fill: BattleFill,
): BattleReducerRouteFill | undefined {
  const kind = battleFillKind(fill);
  if (kind === "abilityCheck") return "abilityCheck";
  if (fill.kind === "abilityChoice") {
    return { kind: "abilityChoice", ability: fill.value };
  }
  if (kind === "attackRoll") return "attackRoll";
  if (kind === "concentrationSavingThrow") return "concentrationSavingThrow";
  if (kind === "creatureAttackZeroDamage") return "rolledDice";
  if (kind === "damageTypeChoice") return "damageTypeChoice";
  if (kind === "deathSavingThrow") return "deathSavingThrow";
  if (kind === "grappleOutcome") return "grappleOutcome";
  if (kind === "hitPointHealingDistribution") {
    return "hitPointHealingDistribution";
  }
  if (kind === "interruptDecision") return "interruptDecision";
  if (kind === "magicWeaponTargetItem") return "magicWeaponTargetItem";
  if (kind === "movement") return "movement";
  if (kind === "objectTargetChoice") return "targetChoice";
  if (kind === "rolledDice") return "rolledDice";
  if (kind === "sanctuaryInterdictionOutcome") {
    return "sanctuaryInterdictionOutcome";
  }
  if (kind === "savingThrowOutcome") return "savingThrowOutcome";
  if (kind === "spellTargetAllocation") return "spellTargetAllocation";
  if (kind === "spellTargetList") return "spellTargetList";
  if (kind === "targetChoice") return "targetChoice";
  if (kind === "unitFeatureDecision") return "unitFeatureDecision";
  if (kind === "wildShapeEquipmentDisposition") {
    return "wildShapeEquipmentDisposition";
  }
  return undefined;
}
