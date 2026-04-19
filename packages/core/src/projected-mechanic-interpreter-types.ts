import type {
  ProjectedActivationCost,
  ProjectedExecutableAction,
  ProjectedExecutableAttachment,
  ProjectedGrantedActionRestriction,
  ProjectedResourceGate,
  ProjectedSaveDc,
  ProjectedSource,
  ProjectedUsageLimit,
} from "#/projected-executable.ts";

export interface ProjectedInterpreterActor {
  readonly actorId: string;
  readonly characterLevel: number;
  readonly fighterLevel: number;
  readonly spellSaveDc: number | null;
}

export interface ProjectedResolvedAmount {
  readonly dice: number;
  readonly dieSize: number;
  readonly flat: number;
}

export interface ProjectedTargetResolution<TOutcome extends string> {
  readonly targetId: string;
  readonly outcome: TOutcome;
}

export interface ProjectedAmountResolution {
  readonly targetId: string;
  readonly total: number;
  readonly rolledTotal?: number;
}

export interface ProjectedAttachmentRequest {
  readonly source: ProjectedSource;
  readonly actor: ProjectedInterpreterActor;
  readonly attachment: ProjectedExecutableAttachment;
}

export interface ProjectedSaveGateRequest extends ProjectedAttachmentRequest {
  readonly ability: Extract<
    ProjectedExecutableAction,
    { readonly tag: "PEASaveGateDamage" }
  >["ability"];
  readonly dc: number;
  readonly dcSource: ProjectedSaveDc;
  readonly targetIds: ReadonlyArray<string>;
}

export interface ProjectedAmountRequest {
  readonly source: ProjectedSource;
  readonly actor: ProjectedInterpreterActor;
  readonly amount: ProjectedResolvedAmount;
  readonly targetIds: ReadonlyArray<string>;
}

export interface ProjectedExecutionRuntime {
  readonly resolveAttachment: (
    request: ProjectedAttachmentRequest,
  ) => ReadonlyArray<string>;
  readonly resolveSaveGate: (
    request: ProjectedSaveGateRequest,
  ) => ReadonlyArray<ProjectedTargetResolution<"fail" | "success">>;
  readonly resolveAmount: (
    request: ProjectedAmountRequest,
  ) => ReadonlyArray<ProjectedAmountResolution>;
}

export type ProjectedInterpreterTransition =
  | {
      readonly tag: "PITSpendActivation";
      readonly value: {
        readonly cost: Exclude<ProjectedActivationCost, "PACFree">;
      };
    }
  | {
      readonly tag: "PITSpendResourceUse";
      readonly value: {
        readonly gate: Extract<
          ProjectedResourceGate,
          { readonly tag: "PRGUseCount" }
        >;
      };
    }
  | {
      readonly tag: "PITMarkUsageLimit";
      readonly value: {
        readonly usageLimit: Exclude<ProjectedUsageLimit, "PULNone">;
      };
    }
  | {
      readonly tag: "PITDirect";
      readonly value: {
        readonly attachment: ProjectedExecutableAttachment;
        readonly targetIds: ReadonlyArray<string>;
      };
    }
  | {
      readonly tag: "PITSaveGate";
      readonly value: {
        readonly attachment: ProjectedExecutableAttachment;
        readonly ability: Extract<
          ProjectedExecutableAction,
          { readonly tag: "PEASaveGateDamage" }
        >["ability"];
        readonly dc: number;
        readonly dcSource: ProjectedSaveDc;
        readonly targetIds: ReadonlyArray<string>;
        readonly outcomes: ReadonlyArray<
          ProjectedTargetResolution<"fail" | "success">
        >;
      };
    }
  | {
      readonly tag: "PITDamage";
      readonly value: {
        readonly damageType: Extract<
          ProjectedExecutableAction,
          { readonly tag: "PEASaveGateDamage" }
        >["damageType"];
        readonly targetId: string;
        readonly amount: ProjectedResolvedAmount;
        readonly total: number;
        readonly rolledTotal?: number;
      };
    }
  | {
      readonly tag: "PITHealHp";
      readonly value: {
        readonly targetId: string;
        readonly amount: ProjectedResolvedAmount;
        readonly total: number;
        readonly rolledTotal?: number;
      };
    }
  | {
      readonly tag: "PITGrantExtraAction";
      readonly value: {
        readonly targetId: string;
        readonly restriction: ProjectedGrantedActionRestriction;
        readonly pendingUntilActionSpend: true;
      };
    };

export interface ProjectedInterpretation {
  readonly source: ProjectedSource;
  readonly actor: ProjectedInterpreterActor;
  readonly transitions: ReadonlyArray<ProjectedInterpreterTransition>;
}
