import type {
  AdmittedBattleResolutionInput,
  BattleActDiscoveryCandidate,
  BattleHole,
  BattleResolutionResult,
  BattleState,
  SupportedSpellInvocation,
} from "../battle-state-execution.ts";
import { Match } from "effect";
import {
  battleReducerRouteFill,
  battleReducerRouteHoles,
  discoverBattleActsRoute,
  nonEmptyRouteEvents,
  resolveBattleSubjectRoute,
  resolveBattleSubjectWithoutFillRoute,
} from "./reducer-route-builders.ts";
import type {
  BattleReducerRouteEvent,
  BattleReducerRouteEvents,
  BattleReducerRouteFill,
  BattleReducerRouteHole,
  BattleReducerRouteOwnerGroup,
  BattleReducerRouteSubjectFamily,
} from "./reducer-route-protocol.ts";
import { spellInvocationForRouteSubject } from "./reducer-route-spell-query.ts";
import { battleActiveEffects } from "./reducer-route-state-query.ts";

const WEAPON_SPELL_ROUTE_SUBJECTS = [
  "spellHostedWeaponAttack",
  "weaponDamageRider",
  "heldWeaponActiveEffect",
  "weaponEnhancementItemTarget",
] as const satisfies ReadonlyArray<BattleReducerRouteSubjectFamily>;

type WeaponSpellRouteSubject = (typeof WEAPON_SPELL_ROUTE_SUBJECTS)[number];

export function weaponSpellRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  const subject = weaponSpellRouteSubject(state, act.subject);
  if (subject === undefined) return undefined;
  return discoverBattleActsRoute(
    subject,
    weaponSpellDiscoveryHoles(subject, act.initialHoles),
    weaponSpellDiscoveryOwner(subject),
  );
}

export function weaponSpellRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  return (
    weaponSpellProcedureRouteForResolution(input, result) ??
    weaponSpellCleanupRouteForResolution(input, result)
  );
}

function weaponSpellProcedureRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const subject = weaponSpellRouteSubject(input.state, input.subject);
  if (subject === undefined) return undefined;
  if (result.tag === "invalid") {
    return result.reason === "staleSubject"
      ? [
          resolveBattleSubjectWithoutFillRoute(
            subject,
            [],
            "battleHoleFrontier",
          ),
        ]
      : undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    if (result.tag !== "resolved" || subject === "spellHostedWeaponAttack") {
      return undefined;
    }
    return [
      resolveBattleSubjectWithoutFillRoute(subject, [], "battleActiveEffect"),
    ];
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === undefined) return undefined;
  if (
    subject === "weaponEnhancementItemTarget" &&
    routeFill === "magicWeaponTargetItem" &&
    result.tag === "resolved"
  ) {
    return [
      resolveBattleSubjectWithoutFillRoute(subject, [], "battleActiveEffect"),
    ];
  }
  if (subject !== "spellHostedWeaponAttack") return undefined;
  const owners = spellHostedWeaponAttackRouteOwners(routeFill);
  if (owners === undefined) return undefined;
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  const route: BattleReducerRouteEvent[] = [
    resolveBattleSubjectRoute(subject, routeFill, holes, owners.resolveOwner),
  ];
  const nextDiscoveryOwner = spellHostedWeaponAttackNextDiscoveryOwner(holes);
  if (nextDiscoveryOwner !== undefined) {
    route.push(discoverBattleActsRoute(subject, holes, nextDiscoveryOwner));
  }
  return nonEmptyRouteEvents(route);
}

function weaponSpellRouteSubject(
  state: BattleState,
  subject: AdmittedBattleResolutionInput["subject"],
): WeaponSpellRouteSubject | undefined {
  if (
    subject.tag !== "actionSpell" &&
    subject.tag !== "bonusActionSpell" &&
    subject.tag !== "bonusActionDashSpell"
  ) {
    return undefined;
  }
  const invocation = spellInvocationForRouteSubject(state, subject);
  return invocation === undefined
    ? undefined
    : weaponSpellRouteSubjectForProcedure(invocation.procedure);
}

function weaponSpellRouteSubjectForProcedure(
  procedure: SupportedSpellInvocation["procedure"],
): WeaponSpellRouteSubject | undefined {
  if (procedure === "spellHostedWeaponAttack") {
    return "spellHostedWeaponAttack";
  }
  if (procedure === "weaponDamageRider") return "weaponDamageRider";
  if (procedure === "weaponAttackOverride") return "heldWeaponActiveEffect";
  if (procedure === "magicWeaponEnhancement") {
    return "weaponEnhancementItemTarget";
  }
  return undefined;
}

function weaponSpellDiscoveryOwner(
  subject: WeaponSpellRouteSubject,
): BattleReducerRouteOwnerGroup {
  return Match.value(subject).pipe(
    Match.when("spellHostedWeaponAttack", () => "battleActionEconomy" as const),
    Match.when(
      "weaponDamageRider",
      () => "battleSpellSlotAndActionEconomy" as const,
    ),
    Match.when("heldWeaponActiveEffect", () => "battleActionEconomy" as const),
    Match.when(
      "weaponEnhancementItemTarget",
      () => "battleItemTargetBoundary" as const,
    ),
    Match.exhaustive,
  );
}

function weaponSpellDiscoveryHoles(
  subject: WeaponSpellRouteSubject,
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  return Match.value(subject).pipe(
    Match.when("spellHostedWeaponAttack", () => battleReducerRouteHoles(holes)),
    Match.when("weaponDamageRider", () => battleReducerRouteHoles(holes)),
    Match.when("heldWeaponActiveEffect", () => battleReducerRouteHoles(holes)),
    Match.when("weaponEnhancementItemTarget", () => []),
    Match.exhaustive,
  );
}

function spellHostedWeaponAttackRouteOwners(
  fill: BattleReducerRouteFill,
): { readonly resolveOwner: BattleReducerRouteOwnerGroup } | undefined {
  if (fill === "damageTypeChoice") {
    return { resolveOwner: "battleHoleFrontier" };
  }
  if (fill === "targetChoice") {
    return { resolveOwner: "battleTargetSelection" };
  }
  if (fill === "attackRoll") return { resolveOwner: "battleAttackRoll" };
  if (fill === "rolledDice") return { resolveOwner: "battleHitPoint" };
  return undefined;
}

function spellHostedWeaponAttackNextDiscoveryOwner(
  holes: readonly BattleReducerRouteHole[],
): BattleReducerRouteOwnerGroup | undefined {
  if (holes.includes("targetChoice")) return "battleTargetSelection";
  if (holes.includes("attackRoll")) return "battleAttackRoll";
  if (holes.includes("rolledDice")) return "battleHitPoint";
  return undefined;
}

function weaponSpellCleanupRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    result.tag !== "resolved" ||
    input.subject.tag !== "runtimeCommand" ||
    input.subject.command !== "endTurn" ||
    !weaponSpellActiveEffectWasRemoved(input.state, result.state)
  ) {
    return undefined;
  }
  return [
    discoverBattleActsRoute(
      "weaponHostedSpellEffectCleanup",
      [],
      "battleActiveEffect",
    ),
    resolveBattleSubjectWithoutFillRoute(
      "weaponHostedSpellEffectCleanup",
      [],
      "battleActiveEffect",
    ),
  ];
}

function weaponSpellActiveEffectWasRemoved(
  before: BattleState,
  after: BattleState,
): boolean {
  const beforeCounts = weaponSpellActiveEffectCounts(before);
  const afterCounts = weaponSpellActiveEffectCounts(after);
  return (
    afterCounts.weaponAttackOverride < beforeCounts.weaponAttackOverride ||
    afterCounts.weaponDamageRider < beforeCounts.weaponDamageRider ||
    afterCounts.magicWeaponEnhancement < beforeCounts.magicWeaponEnhancement
  );
}

function weaponSpellActiveEffectCounts(state: BattleState): {
  readonly weaponAttackOverride: number;
  readonly weaponDamageRider: number;
  readonly magicWeaponEnhancement: number;
} {
  return battleActiveEffects(state).reduce(
    (counts, effect) => {
      if (effect.kind === "spellWeaponAttackOverride") {
        return {
          ...counts,
          weaponAttackOverride: counts.weaponAttackOverride + 1,
        };
      }
      if (effect.kind === "spellWeaponDamageRider") {
        return {
          ...counts,
          weaponDamageRider: counts.weaponDamageRider + 1,
        };
      }
      if (effect.kind === "spellMagicWeaponEnhancement") {
        return {
          ...counts,
          magicWeaponEnhancement: counts.magicWeaponEnhancement + 1,
        };
      }
      return counts;
    },
    {
      weaponAttackOverride: 0,
      weaponDamageRider: 0,
      magicWeaponEnhancement: 0,
    },
  );
}
