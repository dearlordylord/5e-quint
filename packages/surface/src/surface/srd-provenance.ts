export const SRD_PROVENANCE_KIND = "srd-5.2.1" as const;

export type SrdProvenance = {
  readonly kind: typeof SRD_PROVENANCE_KIND;
  readonly section: string;
};
