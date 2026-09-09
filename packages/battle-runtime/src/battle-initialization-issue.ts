import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { CombatantId } from "./identity.ts";
import type { CharacterBattleInvocationSpellAccessIssue } from "./character-battle-resources.ts";
import type {
  BattleStateInitIssueFacts,
  BattleStateInitLeafIssue,
} from "./battle-state-execution.ts";
import type { BattleStatBlockProjectionFailure } from "./stat-block-projection-failure.ts";
import type { StatBlockResourceGraphAdmissionFailure } from "./stat-block-execution-state.ts";
import type { RegisteredSpellProcedureAdmissionIssue } from "./battle-reducer/spell-procedure-profiles/registry.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import { Match } from "effect";

type InvocationSpellNotRepresentedIssue = Extract<
  CharacterBattleInvocationSpellAccessIssue,
  { readonly message: string }
>;

type InvocationSpellMechanicsUnsupportedIssue = Extract<
  CharacterBattleInvocationSpellAccessIssue,
  { readonly issue: unknown }
>["issue"];

export type BattleInvocationSpellAccessInitializationCause =
  | {
      readonly kind: "spellNotRepresented";
      readonly message: InvocationSpellNotRepresentedIssue["message"];
    }
  | {
      readonly kind: "unsupportedMechanics";
      readonly issue: InvocationSpellMechanicsUnsupportedIssue;
    };

type BattleAdmissionInitializationIssueFacts =
  | {
      readonly kind: "characterSpellProcedureInvalid";
      readonly combatantId: CombatantId;
      readonly issueIndex: number;
      readonly cause: RegisteredSpellProcedureAdmissionIssue;
    }
  | {
      readonly kind: "characterInvocationSpellAccessInvalid";
      readonly combatantId: CombatantId;
      readonly accessIndex: number;
      readonly cause: BattleInvocationSpellAccessInitializationCause;
    };

export type BattleInitializationIssueFacts =
  | BattleStateInitIssueFacts
  | BattleAdmissionInitializationIssueFacts;

/** A flat projection of one initialization fact for boundary payloads. */
export type BattleInitializationIssueFact = {
  [K in BattleInitializationIssueFacts["kind"]]: Omit<
    Extract<BattleInitializationIssueFacts, { readonly kind: K }>,
    "kind"
  > & { readonly reason: K };
}[BattleInitializationIssueFacts["kind"]];

type BattleAdmissionInitializationLeafIssue = {
  readonly tag: "battleAdmissionInitIssue";
  readonly ownerPath?: readonly (string | number)[];
} & BattleAdmissionInitializationIssueFacts;

export type BattleInitializationLeafIssue =
  | BattleAdmissionInitializationLeafIssue
  | ({
      readonly tag: "battleStateInitIssue";
      readonly message: string;
      readonly ownerPath?: readonly (string | number)[];
    } & BattleStateInitIssueFacts)
  | {
      readonly tag: "statBlockResourceGraphIssue";
      readonly issues: ReadonlyNonEmptyArray<StatBlockResourceGraphAdmissionFailure>;
      readonly combatantId: CombatantId;
      readonly ownerPath: readonly (string | number)[];
    }
  | {
      readonly tag: "statBlockProjectionFailure";
      readonly combatantId: CombatantId;
      readonly failure: BattleStatBlockProjectionFailure;
      readonly ownerPath: readonly (string | number)[];
    }
  | {
      readonly tag: "weaponLoadoutMismatch";
      readonly slot: "main-hand" | "off-hand";
      readonly ownerPath?: readonly (string | number)[];
    };

export type BattleInitializationIssue =
  | BattleInitializationLeafIssue
  | {
      readonly tag: "battleStateInitIssues";
      readonly issues: readonly [
        BattleInitializationLeafIssue,
        BattleInitializationLeafIssue,
        ...BattleInitializationLeafIssue[],
      ];
    };

export type BattleProjectedCombatantAdmissionLeafIssue =
  | BattleStateInitLeafIssue
  | BattleAdmissionInitializationLeafIssue;

export function battleProjectedCombatantAdmissionLeafIssueMessage(
  issue: BattleProjectedCombatantAdmissionLeafIssue,
): string {
  return Match.value(issue).pipe(
    Match.when({ tag: "battleStateInitIssue" }, battleStateInitIssueMessage),
    Match.when(
      { tag: "statBlockResourceGraphIssue" },
      battleStateInitIssueMessage,
    ),
    Match.when({ tag: "weaponLoadoutMismatch" }, battleStateInitIssueMessage),
    Match.when({ tag: "battleAdmissionInitIssue" }, (admissionIssue) =>
      Match.value(admissionIssue).pipe(
        Match.discriminatorsExhaustive("kind")({
          characterSpellProcedureInvalid: ({ cause }) => cause.message,
          characterInvocationSpellAccessInvalid: ({ cause }) =>
            Match.value(cause).pipe(
              Match.discriminatorsExhaustive("kind")({
                spellNotRepresented: ({ message }) => message,
                unsupportedMechanics: ({ issue: mechanicsIssue }) =>
                  mechanicsIssue.message,
              }),
            ),
        }),
      ),
    ),
    Match.exhaustive,
  );
}
