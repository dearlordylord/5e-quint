import { Schema } from "effect";

export const BENCHMARK_CONTEXT_PROFILES = [
  "documentDeclarationSet",
  "boundedCapabilityProjection",
] as const;
export type BenchmarkContextProfile =
  (typeof BENCHMARK_CONTEXT_PROFILES)[number];

export const BenchmarkContextProfileSchema = Schema.Literals(
  BENCHMARK_CONTEXT_PROFILES,
);
