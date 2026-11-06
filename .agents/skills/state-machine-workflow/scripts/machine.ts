import { createMachine, transition } from "xstate";
import type { Definition, Event, Facts } from "./schema.ts";

export function validateDefinition(definition: Definition): void {
  const names = Object.keys(definition.states);
  const valid = (name: string) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(name);
  if (!names.length || !Object.hasOwn(definition.states, definition.initial)) throw new Error("Unknown initial state");
  for (const [name, state] of Object.entries(definition.states)) {
    if (!valid(name)) throw new Error("State names must be simple identifiers");
    if (state.final && Object.keys(state.on ?? {}).length) throw new Error("Final states cannot have transitions");
    for (const [event, edge] of Object.entries(state.on ?? {})) {
      if (!valid(event) || !Object.hasOwn(definition.states, edge.target)) throw new Error("Invalid event or target");
    }
  }
}

type FactValues = Facts;

export function advance(definition: Definition, state: string, facts: FactValues, event: Event): string {
  const current = definition.states[state];
  if (!current || current.final || !Object.hasOwn(current.on ?? {}, event.type)) throw new Error("Event is not allowed in this state");
  const states = Object.fromEntries(Object.entries(definition.states).map(([name, node]) => [name, {
    ...(node.final ? { type: "final" as const } : {}),
    on: Object.fromEntries(Object.entries(node.on ?? {}).map(([type, edge]) => [type, {
      target: edge.target,
      guard: () => Object.entries(edge.requires ?? {}).every(([field, expected]) => {
        const value = typeof expected === "string" ? expected : Object.hasOwn(facts, expected.fact) ? facts[expected.fact] : undefined;
        return value !== undefined && Object.hasOwn(event.facts, field) && event.facts[field] === value;
      }),
    }])),
  }]));
  const machine = createMachine({ id: definition.id, initial: definition.initial, states });
  const previous = machine.resolveState({ value: state, context: {} });
  if (!previous.can({ type: event.type })) throw new Error("Transition requirements were not met");
  const [next] = transition(machine, previous, { type: event.type });
  if (typeof next.value !== "string") throw new Error("Expected a flat machine state");
  return next.value;
}

export function graph(definition: Definition, active: string): string {
  const lines = ["stateDiagram-v2", `    [*] --> ${definition.initial}`];
  for (const [name, state] of Object.entries(definition.states)) {
    if (state.final) lines.push(`    ${name} --> [*]`);
    for (const [event, edge] of Object.entries(state.on ?? {})) {
      lines.push(`    ${name} --> ${edge.target}: ${event}${Object.keys(edge.requires ?? {}).length ? " [guarded]" : ""}`);
    }
  }
  lines.push("    classDef active fill:#dbeafe,stroke:#2563eb,stroke-width:3px", `    class ${active} active`);
  return lines.join("\n");
}
