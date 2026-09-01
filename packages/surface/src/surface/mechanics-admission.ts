import type {
  StatBlockMechanicsPath as SurfaceStatBlockMechanicsPath,
  UnitMechanicsPath as SurfaceUnitMechanicsPath,
} from "./mechanics-graph-path.ts";
import type { SrdStatBlockRecord, SrdSurface, SrdUnitRecord } from "./types.ts";

export const SURFACE_MECHANICS_ADMISSION_REASONS = [
  "unsupported_mechanics",
  "ambiguous_mechanics",
  "incomplete_graph",
  "no_admitted_procedure",
] as const;

export type SurfaceMechanicsAdmissionReason =
  (typeof SURFACE_MECHANICS_ADMISSION_REASONS)[number];

/**
 * A mechanics issue returned by a static admission profile before catalog
 * installation attaches an authored-record root. Its path is relative to the
 * record's typed mechanics value rather than a persisted diagnostic path.
 */
export type UnitMechanicsAdmissionIssueDraft<
  UnitMechanicsPath extends SurfaceUnitMechanicsPath = SurfaceUnitMechanicsPath,
> = {
  readonly reason: SurfaceMechanicsAdmissionReason;
  readonly mechanicsPath: UnitMechanicsPath;
  readonly message: string;
};

export type StatBlockMechanicsAdmissionIssueDraft<
  StatBlockMechanicsPath extends SurfaceStatBlockMechanicsPath =
    SurfaceStatBlockMechanicsPath,
> = {
  readonly reason: SurfaceMechanicsAdmissionReason;
  readonly mechanicsPath: StatBlockMechanicsPath;
  readonly message: string;
};

export type UnitMechanicsAdmissionResult<
  UnitMechanicsPath extends SurfaceUnitMechanicsPath = SurfaceUnitMechanicsPath,
> =
  | { readonly tag: "admitted" }
  | {
      readonly tag: "rejected";
      readonly issues: readonly [
        UnitMechanicsAdmissionIssueDraft<UnitMechanicsPath>,
        ...UnitMechanicsAdmissionIssueDraft<UnitMechanicsPath>[],
      ];
    };

export type StatBlockMechanicsAdmissionResult<
  StatBlockMechanicsPath extends SurfaceStatBlockMechanicsPath =
    SurfaceStatBlockMechanicsPath,
> =
  | { readonly tag: "admitted" }
  | {
      readonly tag: "rejected";
      readonly issues: readonly [
        StatBlockMechanicsAdmissionIssueDraft<StatBlockMechanicsPath>,
        ...StatBlockMechanicsAdmissionIssueDraft<StatBlockMechanicsPath>[],
      ];
    };

/** Context-independent mechanics checks supplied by the owning runtimes. */
export type SurfaceMechanicsAdmission<
  UnitMechanicsPath extends SurfaceUnitMechanicsPath = SurfaceUnitMechanicsPath,
  StatBlockMechanicsPath extends SurfaceStatBlockMechanicsPath =
    SurfaceStatBlockMechanicsPath,
> = {
  readonly admitUnit: (input: {
    readonly unit: SrdUnitRecord;
    readonly surface: SrdSurface;
  }) => UnitMechanicsAdmissionResult<UnitMechanicsPath>;
  readonly admitStatBlock: (input: {
    readonly statBlock: SrdStatBlockRecord;
    readonly surface: SrdSurface;
  }) => StatBlockMechanicsAdmissionResult<StatBlockMechanicsPath>;
};
