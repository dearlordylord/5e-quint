import type {
  SurfaceCatalogInstallIssue,
  SurfaceMechanicsAdmission,
} from "./catalog-install.ts";
import type {
  MechanicsGraphNodeRole,
  StatBlockMechanicsPath,
  UnitMechanicsPath,
} from "./mechanics-graph-path.ts";

type Assert<Condition extends true> = Condition;

export type ArbitraryStringAdmission = SurfaceMechanicsAdmission<
  // @ts-expect-error arbitrary strings do not satisfy the mechanics-path contract
  string,
  string
>;

// @ts-expect-error presentation is not a mechanics graph node role
export const presentationRole: MechanicsGraphNodeRole = "presentation";

type UnitAdmissionIssue = Extract<
  SurfaceCatalogInstallIssue<UnitMechanicsPath, StatBlockMechanicsPath>,
  { readonly phase: "admission"; readonly root: { readonly kind: "unit" } }
>;

type StatBlockAdmissionIssue = Extract<
  SurfaceCatalogInstallIssue<UnitMechanicsPath, StatBlockMechanicsPath>,
  {
    readonly phase: "admission";
    readonly root: { readonly kind: "statBlock" };
  }
>;

export type UnitRootCarriesUnitPath = Assert<
  UnitAdmissionIssue["mechanicsPath"] extends UnitMechanicsPath ? true : false
>;

export type StatBlockRootCarriesStatBlockPath = Assert<
  StatBlockAdmissionIssue["mechanicsPath"] extends StatBlockMechanicsPath
    ? true
    : false
>;

export type UnitRootRejectsStatBlockPath = Assert<
  Extract<
    UnitAdmissionIssue["mechanicsPath"],
    StatBlockMechanicsPath
  > extends never
    ? true
    : false
>;
