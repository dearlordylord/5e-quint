import { registeredSpellProcedureExecutions } from "./registry.ts";

// The single composition boundary derives execution services from the
// canonical procedure declarations. Construction is intentionally deferred so
// profile modules can depend on execution helpers without a module-initializer
// cycle. Neither view owns another key list or procedure metadata table.
export function spellProcedureExecutionRegistry() {
  return registeredSpellProcedureExecutions();
}
