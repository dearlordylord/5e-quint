-- Warding Bond — SRD 5.2.1 Spell, level 2, Abjuration.
--
-- RAW (Spells/Descriptions-S-Z#Warding Bond):
--   "While the target is within 60 feet of you, it gains a +1 bonus to
--    AC and saving throws, and it has Resistance to all damage."
--   "Also, each time it takes damage, you take the same amount of
--    damage."
--
-- PARTIAL: ending when either creature drops to 0 Hit Points, when the
-- creatures are separated by more than 60 feet, or when the spell is
-- cast again on either creature is not represented in this surface.

let DiceDelta : Type =
      { kind : Text, dice : Natural, dieSize : Natural, sign : Text }

let ChildEffect : Type =
      { kind : Text
      , damageType : Optional Text
      , delta : Optional DiceDelta
      , on : Optional (List Text)
      , rangeFeet : Optional Natural
      }

let Effect : Type =
      { kind : Text
      , damageType : Optional Text
      , delta : Optional DiceDelta
      , on : Optional (List Text)
      , rangeFeet : Optional Natural
      , effects : Optional (List ChildEffect)
      }

let noneChildren = None (List ChildEffect)

let plusOne : DiceDelta =
      { kind = "fixed_dice", dice = 1, dieSize = 1, sign = "+" }

let acBonus : Effect =
      { kind = "modify_ac"
      , damageType = None Text
      , delta = Some plusOne
      , on = None (List Text)
      , rangeFeet = None Natural
      , effects = noneChildren
      }

let saveBonus : Effect =
      { kind = "modify_roll_numeric"
      , damageType = None Text
      , delta = Some plusOne
      , on = Some [ "saving_throw" ]
      , rangeFeet = None Natural
      , effects = noneChildren
      }

let resistance =
      \(damageType : Text) ->
        { kind = "grant_resistance"
        , damageType = Some damageType
        , delta = None DiceDelta
        , on = None (List Text)
        , rangeFeet = None Natural
        }

let childEffects =
      [ resistance "acid"
      , resistance "bludgeoning"
      , resistance "cold"
      , resistance "fire"
      , resistance "force"
      , resistance "lightning"
      , resistance "necrotic"
      , resistance "piercing"
      , resistance "poison"
      , resistance "psychic"
      , resistance "radiant"
      , resistance "slashing"
      , resistance "thunder"
      ]

let allDamageResistance : Effect =
      { kind = "composite"
      , damageType = None Text
      , delta = None DiceDelta
      , on = None (List Text)
      , rangeFeet = None Natural
      , effects = Some childEffects
      }

let shareDamage : Effect =
      { kind = "share_damage_to_caster"
      , damageType = None Text
      , delta = None DiceDelta
      , on = None (List Text)
      , rangeFeet = Some 60
      , effects = noneChildren
      }

let wardingBond =
      { kind = "spell"
      , id = "warding_bond"
      , name = "Warding Bond"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Warding Bond"
          }
      , description =
          "You touch another willing creature and create a mystic connection until the spell ends. While the target is within 60 feet of you, it gains a +1 bonus to AC and saving throws and has Resistance to all damage. Each time it takes damage, you take the same amount of damage. The spell ends if you drop to 0 Hit Points, if you and the target become separated by more than 60 feet, or if the spell is cast again on either connected creature."
      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m =
                  Some
                    "a pair of platinum rings worth 50+ GP each, which you and the target must wear for the duration"
              }
          , duration = { kind = "timed", value = { unit = "hour", amount = 1 } }
          , attachment =
              { kind = "hole"
              , holeId = "warding_bond_target"
              , label = "willing creature"
              , value = { kind = "target", selection = { mode = "one" } }
              }
          , operations =
              [ { trigger = { kind = "passive" }, effect = acBonus }
              , { trigger = { kind = "passive" }, effect = saveBonus }
              , { trigger = { kind = "passive" }, effect = allDamageResistance }
              , { trigger = { kind = "passive" }, effect = shareDamage }
              ]
          }
      }

in  wardingBond
