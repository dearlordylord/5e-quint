# Proposal: Widenings Required for Conjure Fey

## Classification: `structural_widening`

Conjure Fey cannot be honestly encoded in any existing `SpellMechanics` family. The spell's core pattern — conjure a persistent proxy entity, optional attack on cast, repeatable Bonus Action attack on each subsequent turn — does not map to `ongoing_effect`, `activation`, `triggered_reaction`, or `anchored_trigger`.

---

## Primary Gap: Missing Spell Family for Proxy-Conjure

### The pattern

1. Spell creates a **persistent proxy entity** at a point within range (the Fey spirit).
2. **On cast**: The caster *optionally* makes one melee spell attack against a creature within 5 ft of the proxy.
3. **On later turns**: The caster may spend a **Bonus Action** to teleport the proxy (up to 30 ft within sight) and make the same attack again.
4. The proxy persists while concentration holds (up to 10 minutes).

### Why existing families fail

| Family | Why it fails |
|---|---|
| `activation` | Executes all phases at cast time; cannot model per-turn Bonus Action re-use on *later* turns |
| `ongoing_effect` | Passive modifier (roll_modifier or damage_on_hit rider); Conjure Fey's attacks are actively chosen expenditures, not passive riders on the caster's existing attacks |
| `triggered_reaction` | Wrong cost and trigger structure entirely |
| `anchored_trigger` | Plants a location/area trigger; no analog here |

### v4 atoms already exist

The v4 taxonomy has `create_attack_proxy` (effect) and `attack_proxy` (attachment), meaning the atom inventory anticipated this pattern. What is missing is a **spell family** that wires these atoms into a coherent subgraph.

### Proposed family shape: `proxy_conjure`

```
spell_root → activate
activate --consumes--> action_quota
activate --consumes--> spell_slot (≥ 6)
activate --consumes--> concentration_lock
activate --grants--> concentrate → expire (≤ 10 minutes)
activate --grants--> create_attack_proxy
create_attack_proxy --attaches_to--> point (within 60 ft range)

// Optional attack on cast
activate --opens_window--> action_window (optional, on cast)
action_window --grants--> attack_roll (melee_spell_attack)
attack_roll --attaches_to--> target (within 5 ft of proxy)
attack_roll --opens_window--> on_hit_window
on_hit_window --grants--> damage (3d12+mod psychic, linear_per_level slot)
on_hit_window --grants--> apply_condition (frightened, until turn_start_window)

// Per-turn Bonus Action reuse
activate --grants--> bonus_action_window (wielder choice, each turn while concentrated)
bonus_action_window --consumes--> bonus_action_quota
bonus_action_window --grants--> move (proxy teleport, ≤ 30 ft within sight)
bonus_action_window --grants--> attack_roll (same as above)
```

The key structural addition is a spell family that has:
- `create_attack_proxy` effect on cast
- An optional immediate attack
- A repeatable per-turn activation (Bonus Action cost) that moves the proxy and grants another attack

---

## Secondary Gaps (surface widenings within existing types)

These widenings are needed regardless of which family is added.

### 1. `apply_condition` variant in `Effect`

**Current state:** `Effect = DamageEffect | NoneEffect`

**What's needed:** `ApplyConditionEffect = { kind: "apply_condition"; condition: Condition; duration: ConditionDuration }`

The Frightened condition is applied directly on hit (no save). Conjure Fey uses an unconditional on-hit condition application. The `apply_condition` atom already exists in v4, and `SaveGateRiderResult` in the mastery surface has `apply_condition`, but the spell `Effect` type has no such variant.

**Evidence:** *"the target has the Frightened condition until the start of your next turn"*

---

### 2. `frightened` in `Condition`

**Current state:** `Condition = "prone"`

**What's needed:** `Condition = "prone" | "frightened"` (at minimum; likely more conditions as further spells land)

**Evidence:** Conjure Fey applies Frightened; Conjure Fey, Fear, Command (Flee), and many other spells require it.

---

### 3. Dynamic flat in `DiceExpr`

**Current state:** `DiceExpr.flat?: number` — static integer only

**What's needed:** A way to express "plus caster's spellcasting ability modifier" as the flat component.

The damage is defined as **3d12 + spellcasting ability modifier**. The modifier is resolved at runtime from the caster's character sheet; it is not a fixed number baked into the spell encoding.

Options:
- Union: `flat?: number | { kind: "spellcasting_ability_modifier" }`
- Separate field: `flatFromCaster?: "spellcasting_ability_modifier" | "proficiency_bonus"`

This widening likely affects other spells that add the caster's ability modifier to damage (Divine Smite, Inflict Wounds, etc.) — it is not Conjure Fey–specific.

**Evidence:** *"the target takes Psychic damage equal to 3d12 plus your spellcasting ability modifier"*

---

## Slot Scaling (fits existing surface)

The upcast progression (+1d12 per slot above 6) maps cleanly to the existing `DiceAmount` `linear_per_level` shape:

```
{
  kind: "linear_per_level",
  axis: "slot",
  base: { dice: 3, dieSize: 12 },
  perLevel: { dice: 1 },
  startingAtLevel: 6
}
```

No new types needed for this component.

---

## Summary

| Gap | Classification | Priority |
|---|---|---|
| No spell family for proxy-conjure | `structural_widening` | Blocks encoding |
| `Effect` missing `apply_condition` variant | `surface_widening` | Also needed for other spells |
| `Condition` missing `frightened` | `surface_widening` | Also needed for other spells |
| `DiceExpr.flat` cannot hold ability modifier | `surface_widening` | Also needed for other spells |
