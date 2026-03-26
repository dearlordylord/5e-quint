import { type FormEvent, useState } from "react"

import { DEFAULT_HIT_DICE, DEFAULT_SPEED } from "#/components/App.tsx"
import { useT } from "#/i18n.ts"
import type { DndEvent, DndSnapshot } from "#/machine.ts"
import { ALL_DAMAGE_TYPES } from "#/machine-helpers.ts"
import type { Condition, DamageType } from "#/types.ts"
import { ALL_CONDITIONS, d20Roll, healAmount, tempHp } from "#/types.ts"

const DAMAGE_TYPES: ReadonlyArray<DamageType> = Array.from(ALL_DAMAGE_TYPES)
const EMPTY_DAMAGE_SET: ReadonlySet<DamageType> = new Set()

const prevent = (fn: () => void) => (e: FormEvent) => {
  e.preventDefault()
  fn()
}

function Section({ children, title }: { readonly title: string; readonly children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-700 rounded">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-3 py-2 text-sm font-medium hover:bg-gray-700"
      >
        {open ? "▾" : "▸"} {title}
      </button>
      {open && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  )
}

function NumInput({
  label,
  max,
  min,
  onChange,
  value
}: {
  readonly label: string
  readonly value: number
  readonly onChange: (n: number) => void
  readonly min?: number
  readonly max?: number
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="w-24 text-gray-400">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 bg-gray-700 rounded px-2 py-1 text-white"
      />
    </label>
  )
}

function Btn({
  disabled,
  label,
  onClick
}: {
  readonly label: string
  readonly onClick: () => void
  readonly disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded bg-amber-700 px-3 py-1 text-sm text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  )
}

export function EventPanel({
  rageResistances,
  send,
  snapshot
}: {
  readonly send: (e: DndEvent) => void
  readonly snapshot: DndSnapshot
  readonly rageResistances?: ReadonlySet<DamageType>
}) {
  const t = useT()
  const [dmgAmount, setDmgAmount] = useState(5)
  const [dmgType, setDmgType] = useState<DamageType>("bludgeoning")
  const [isCrit, setIsCrit] = useState(false)
  const [healAmt, setHealAmt] = useState(5)
  const [tmpHp, setTmpHp] = useState(5)
  const [d20, setD20] = useState(10)
  const [condition, setCondition] = useState<Condition>("blinded")
  const [exhLevels, setExhLevels] = useState(1)
  const [slotLevel, setSlotLevel] = useState(1)
  const [spellId, setSpellId] = useState("spell_a")
  const [fallDmg, setFallDmg] = useState(10)
  const [keepOld, setKeepOld] = useState(false)

  return (
    <div className="space-y-2 bg-gray-800 rounded-xl p-4">
      <h2 className="text-lg font-bold mb-2">{t.events}</h2>

      <Section title={t.takeDamage}>
        <form
          onSubmit={prevent(() => {
            const mergedResistances =
              rageResistances && rageResistances.size > 0
                ? new Set([...EMPTY_DAMAGE_SET, ...rageResistances])
                : EMPTY_DAMAGE_SET
            send({
              type: "TAKE_DAMAGE",
              amount: dmgAmount,
              damageType: dmgType,
              resistances: mergedResistances,
              vulnerabilities: EMPTY_DAMAGE_SET,
              immunities: EMPTY_DAMAGE_SET,
              isCritical: isCrit
            })
          })}
        >
          <NumInput label={t.amount} value={dmgAmount} onChange={setDmgAmount} min={0} />
          <label className="flex items-center gap-2 text-sm mt-1">
            <span className="w-24 text-gray-400">{t.damageType}</span>
            <select
              value={dmgType}
              onChange={(e) => setDmgType(e.target.value as DamageType)}
              className="bg-gray-700 rounded px-2 py-1 text-white"
            >
              {DAMAGE_TYPES.map((dt) => (
                <option key={dt} value={dt}>
                  {dt}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm mt-1">
            <input type="checkbox" checked={isCrit} onChange={(e) => setIsCrit(e.target.checked)} />
            <span>{t.critical}</span>
          </label>
          <button type="submit" className="mt-2 rounded bg-red-700 px-3 py-1 text-sm text-white hover:bg-red-600">
            {t.takeDamage}
          </button>
        </form>
      </Section>

      <Section title={t.heal}>
        <NumInput label={t.amount} value={healAmt} onChange={setHealAmt} min={0} />
        <Btn label={t.heal} onClick={() => send({ type: "HEAL", amount: healAmount(healAmt) })} />
      </Section>

      <Section title={t.grantTempHp}>
        <NumInput label={t.amount} value={tmpHp} onChange={setTmpHp} min={0} />
        <label className="flex items-center gap-2 text-sm mt-1">
          <input type="checkbox" checked={keepOld} onChange={(e) => setKeepOld(e.target.checked)} />
          <span>{t.keepOld}</span>
        </label>
        <Btn label={t.grantTempHp} onClick={() => send({ type: "GRANT_TEMP_HP", amount: tempHp(tmpHp), keepOld })} />
      </Section>

      <Section title={t.deathSave}>
        <NumInput label={t.roll} value={d20} onChange={setD20} min={1} max={20} />
        <Btn label={t.deathSave} onClick={() => send({ type: "DEATH_SAVE", d20Roll: d20Roll(d20) })} />
      </Section>

      <div className="flex gap-2">
        <Btn label={t.stabilize} onClick={() => send({ type: "STABILIZE" })} />
        <Btn label={t.knockOut} onClick={() => send({ type: "KNOCK_OUT" })} />
      </div>

      <Section title={t.applyCondition}>
        <label className="flex items-center gap-2 text-sm">
          <span className="w-24 text-gray-400">{t.conditions}</span>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as Condition)}
            className="bg-gray-700 rounded px-2 py-1 text-white"
          >
            {ALL_CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2 mt-1">
          <Btn label={t.applyCondition} onClick={() => send({ type: "APPLY_CONDITION", condition })} />
          <Btn label={t.removeCondition} onClick={() => send({ type: "REMOVE_CONDITION", condition })} />
        </div>
      </Section>

      <Section title={t.exhaustion}>
        <NumInput label={t.amount} value={exhLevels} onChange={setExhLevels} min={1} max={6} />
        <div className="flex gap-2">
          <Btn label={t.addExhaustion} onClick={() => send({ type: "ADD_EXHAUSTION", levels: exhLevels })} />
          <Btn label={t.reduceExhaustion} onClick={() => send({ type: "REDUCE_EXHAUSTION", levels: exhLevels })} />
        </div>
      </Section>

      <Section title={t.turnResources}>
        <Btn
          label={t.startTurn}
          onClick={() =>
            send({
              type: "START_TURN",
              baseSpeed: DEFAULT_SPEED,
              armorPenalty: 0,
              extraAttacks: 1,
              callerSpeedModifier: 0,
              isGrappling: false,
              grappledTargetTwoSizesSmaller: false,
              startOfTurnEffects: []
            })
          }
        />
      </Section>

      <Section title={t.spellSlots}>
        <NumInput label={t.level} value={slotLevel} onChange={setSlotLevel} min={1} max={9} />
        <Btn
          label={t.expendSlot}
          disabled={!snapshot.can({ type: "EXPEND_SLOT", level: slotLevel })}
          onClick={() => send({ type: "EXPEND_SLOT", level: slotLevel })}
        />
        <div className="mt-2">
          <input
            value={spellId}
            onChange={(e) => setSpellId(e.target.value)}
            className="w-full bg-gray-700 rounded px-2 py-1 text-white text-sm mt-1"
            placeholder="spell_a"
          />
          <div className="flex gap-2 mt-1">
            <Btn
              label={t.startConcentration}
              onClick={() => send({ type: "START_CONCENTRATION", spellId, durationTurns: 10, expiresAt: "end" })}
            />
            <Btn label={t.breakConcentration} onClick={() => send({ type: "BREAK_CONCENTRATION" })} />
          </div>
        </div>
      </Section>

      <Section title={t.shortRest + " / " + t.longRest}>
        <div className="flex gap-2">
          <Btn label={t.shortRest} onClick={() => send({ type: "SHORT_REST", conMod: 2, hdRolls: [4] })} />
          <Btn label={t.longRest} onClick={() => send({ type: "LONG_REST", totalHitDice: DEFAULT_HIT_DICE })} />
        </div>
      </Section>

      <Section title={t.applyFall + " / " + t.suffocate}>
        <NumInput label={t.amount} value={fallDmg} onChange={setFallDmg} min={0} />
        <div className="flex gap-2 mt-1">
          <Btn
            label={t.applyFall}
            onClick={() =>
              send({
                type: "APPLY_FALL",
                damageRoll: fallDmg,
                resistances: EMPTY_DAMAGE_SET,
                vulnerabilities: EMPTY_DAMAGE_SET,
                immunities: EMPTY_DAMAGE_SET
              })
            }
          />
          <Btn label={t.suffocate} onClick={() => send({ type: "SUFFOCATE" })} />
        </div>
      </Section>
    </div>
  )
}
