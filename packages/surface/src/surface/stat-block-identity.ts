import { Brand } from "effect";

export type NormalizedStatBlockIdentity = string &
  Brand.Brand<"NormalizedStatBlockIdentity">;

const NormalizedStatBlockIdentity =
  Brand.nominal<NormalizedStatBlockIdentity>();

export function normalizeStatBlockIdentity(
  name: string,
): NormalizedStatBlockIdentity {
  return NormalizedStatBlockIdentity(
    name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase(),
  );
}
