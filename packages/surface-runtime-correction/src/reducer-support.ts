import type { UnitRecord } from '@dnd/prototype-content-surface/surface/types';

export class UnsupportedUnitShapeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsupportedUnitShapeError'
  }
}

export function checkSupportedUnit(unit: UnitRecord) {
  if (unit.kind !== 'spell' && unit.kind !== 'class_feature') {
    throw new UnsupportedUnitShapeError(
      `Unsupported unit kind for reducer: ${unit.kind}`,
    )
  }

  if (unit.mechanics.family !== 'activation') {
    throw new UnsupportedUnitShapeError(
      `Unsupported mechanics family for reducer unit ${unit.id}: ${unit.mechanics.family}`,
    )
  }

  if (unit.mechanics.phases.length !== 1) {
    throw new UnsupportedUnitShapeError(
      `Reducer currently supports exactly one phase for unit ${unit.id}`,
    )
  }

  const [phase] = unit.mechanics.phases
  if (
    phase.kind !== 'attack_roll' &&
    phase.kind !== 'save_gate' &&
    phase.kind !== 'direct'
  ) {
    throw new UnsupportedUnitShapeError(
      `Unsupported phase kind for reducer unit ${unit.id}: ${phase.kind}`,
    )
  }

  if ('continue' in phase && phase.continue !== undefined) {
    throw new UnsupportedUnitShapeError(
      `Reducer currently does not support continuation for unit ${unit.id}`,
    )
  }

  const attachment =
    phase.attachment.kind === 'hole' ? phase.attachment.value : phase.attachment
  if (
    attachment.kind !== 'self' &&
    attachment.kind !== 'target' &&
    attachment.kind !== 'area'
  ) {
    throw new UnsupportedUnitShapeError(
      `Unsupported attachment kind for reducer unit ${unit.id}: ${attachment.kind}`,
    )
  }

  if (phase.kind === 'attack_roll') {
    if (phase.onHit.length !== 1 || phase.onMiss.length !== 1) {
      throw new UnsupportedUnitShapeError(
        `Reducer currently supports one on-hit atom and one on-miss atom for unit ${unit.id}`,
      )
    }

    if (phase.onHit[0]?.kind !== 'damage') {
      throw new UnsupportedUnitShapeError(
        `Reducer currently supports only damage on attack-roll hit for unit ${unit.id}`,
      )
    }

    if (phase.onMiss[0]?.kind !== 'none') {
      throw new UnsupportedUnitShapeError(
        `Reducer currently supports only none on attack-roll miss for unit ${unit.id}`,
      )
    }
  }

  if (phase.kind === 'direct') {
    if (phase.effects?.length !== 1) {
      throw new UnsupportedUnitShapeError(
        `Reducer currently supports exactly one direct effect for unit ${unit.id}`,
      )
    }

    if (
      phase.effects[0]?.kind !== 'heal_hp' &&
      phase.effects[0]?.kind !== 'grant_extra_action'
    ) {
      throw new UnsupportedUnitShapeError(
        `Unsupported direct effect for reducer unit ${unit.id}: ${phase.effects[0]?.kind}`,
      )
    }
  }

  if (phase.kind === 'save_gate') {
    if (phase.onFail.kind !== 'damage') {
      throw new UnsupportedUnitShapeError(
        `Reducer currently supports only damage on save failure for unit ${unit.id}`,
      )
    }

    if (phase.onSuccess.kind !== 'half_damage') {
      throw new UnsupportedUnitShapeError(
        `Reducer currently supports only half_damage on save success for unit ${unit.id}`,
      )
    }
  }

  return unit;
}
