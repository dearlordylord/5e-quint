-- Magic Weapon — SRD 5.2.1, level 2 Transmutation spell.
--
-- RAW: "You touch a nonmagical weapon. Until the spell ends, that weapon
-- becomes a magic weapon with a +1 bonus to attack rolls and damage rolls.
-- The spell ends early if you cast it again."
--
-- Upcast: +2 at slot 3–5, +3 at slot 6+. DiceDelta has no slot-threshold-tier
-- variant, so the upcast scaling is NOT represented here. The +1 delta covers
-- slot 2 (base cast) only. See proposal-magic_weapon.md for the
-- surface_widening needed to express slot-scaled numeric deltas.
--
-- Note: the "nonmagical" constraint and "weapon" object type are authoring
-- intent only; ObjectFilter has no "nonmagical" or "weapon-kind" predicate.

let Delta = { kind : Text, dice : Natural, dieSize : Natural, sign : Text }

-- Unified effect record: `on` is Optional because modify_damage_numeric
-- does not carry a roll-kind list while modify_roll_numeric does.
let Op =
      { kind : Text
      , delta : Delta
      , on : Optional (List Text)
      }

let baseOp : Op =
      { kind = "modify_roll_numeric"
      , delta = { kind = "fixed_dice", dice = 1, dieSize = 1, sign = "+" }
      , on = Some [ "attack_roll" ]
      }

let damageOp : Op =
      { kind = "modify_damage_numeric"
      , delta = { kind = "fixed_dice", dice = 1, dieSize = 1, sign = "+" }
      , on = None (List Text)
      }

let magicWeapon =
      { kind = "spell"
      , id = "magic_weapon"
      , name = "Magic Weapon"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-R#Magic Weapon"
          }
      , description =
          "You touch a nonmagical weapon. Until the spell ends, that weapon becomes a magic weapon with a +1 bonus to attack rolls and damage rolls. The spell ends early if you cast it again. Using a Higher-Level Spell Slot: The bonus increases to +2 with a level 3-5 spell slot. The bonus increases to +3 with a level 6+ spell slot."
      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "transmutation"
          , castingTime = { kind = "bonus_action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              , earlyEnd = [ { kind = "caster_recasts_spell" } ]
              }
          , attachment = { kind = "object", count = 1 }
          , operations =
              [ { trigger = { kind = "passive" }, effect = baseOp }
              , { trigger = { kind = "passive" }, effect = damageOp }
              ]
          }
      }

in  magicWeapon
