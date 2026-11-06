import { z } from "zod";

const Text = z.string().min(1);
export const Facts = z.record(z.string(), z.string());
export type Facts = z.infer<typeof Facts>;
const Requirement = z.union([z.string(), z.strictObject({ fact: Text })]);
const Edge = z.strictObject({ target: Text, requires: z.record(z.string(), Requirement).optional() });
const State = z.strictObject({ on: z.record(z.string(), Edge).optional(), final: z.boolean().optional() });
export const Definition = z.strictObject({ id: Text, version: Text, initial: Text, facts: Facts, states: z.record(z.string(), State) });
export type Definition = z.infer<typeof Definition>;
export const Event = z.strictObject({ type: Text, facts: Facts });
export type Event = z.infer<typeof Event>;
export const Instance = z.object({
  id: Text, objective: Text, definition_hash: Text, revision: z.number().int().nonnegative(),
  state: Text, facts: z.string(), stopped: z.union([z.literal(0), z.literal(1)]),
});
export type Instance = z.infer<typeof Instance>;
export const Operation = z.object({
  id: Text, instance_id: Text, request: z.string(), status: z.enum(["unknown", "resolved"]), receipt: z.string().nullable(),
});
export type Operation = z.infer<typeof Operation>;
export const Receipt = z.strictObject({
  outcome: z.enum(["accepted", "not-sent", "failed"]), providerReference: Text,
  artifact: Text, sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
export type Receipt = z.infer<typeof Receipt>;
