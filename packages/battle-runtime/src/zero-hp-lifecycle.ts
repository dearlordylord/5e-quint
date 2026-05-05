import type { DeathSaveRuntimeState } from "@dnd/shared-algebras/death-saves-algebra";

export type ZeroHpLifecycle =
  | {
      // Stat Block runtime policy. SRD Monster Death makes 0 HP terminal for
      // this battle combatant; this is not a provenance label.
      readonly policy: "diesAtZeroHp";
    }
  | {
      // Character Build runtime policy. The battle reducer owns drop-to-zero,
      // damage-at-zero, critical damage-at-zero, and massive-damage consequences.
      // Start-turn death-save rolls and post-battle durable handoff preserve
      // this lifecycle across the battle/session boundary.
      readonly policy: "usesDeathSavingThrows";
      readonly deathSaves: DeathSaveRuntimeState;
    };

export type CharacterZeroHpLifecycleInit = Extract<
  ZeroHpLifecycle,
  { readonly policy: "usesDeathSavingThrows" }
>;
