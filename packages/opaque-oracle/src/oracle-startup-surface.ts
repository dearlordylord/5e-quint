import type { SrdSurface } from "@dnd/surface/surface/types";

/** Encode the startup projection with one stable JSON representation. */
export function encodeOracleStartupSurface(surface: SrdSurface): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(surface)}\n`);
}
