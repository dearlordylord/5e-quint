export const UNIT_FEATURE_PROCEDURE_OWNER_KINDS = [
  "unitFeature",
  "unitSupportProfile",
] as const;

export type UnitFeatureProcedureOwnerKind =
  (typeof UNIT_FEATURE_PROCEDURE_OWNER_KINDS)[number];

export function isUnitFeatureProcedureOwner<
  Procedure extends { readonly kind: string },
>(
  procedure: Procedure,
): procedure is Extract<
  Procedure,
  { readonly kind: UnitFeatureProcedureOwnerKind }
> {
  return UNIT_FEATURE_PROCEDURE_OWNER_KINDS.some(
    (candidate) => candidate === procedure.kind,
  );
}
