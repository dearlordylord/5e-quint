type SpellMechanicsMember = {
  readonly Type: unknown;
  readonly Encoded: unknown;
};

export type SpellMechanics<Members extends readonly SpellMechanicsMember[]> =
  Members[number]["Type"];

export type SpellMechanicsEncoded<
  Members extends readonly SpellMechanicsMember[],
> = Members[number]["Encoded"];
