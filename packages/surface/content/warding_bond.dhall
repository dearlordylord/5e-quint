-- Warding Bond — SRD 5.2.1 Spell, level 2, Abjuration.
--
-- RAW (Spells/Descriptions-S-Z#Warding Bond):
--   "You touch another creature that is willing and create a mystic
--    connection between you and the target until the spell ends."
--   "While the target is within 60 feet of you, it gains a +1 bonus to
--    AC and saving throws, and it has Resistance to all damage."
--   "Also, each time it takes damage, you take the same amount of
--    damage."
--   "The spell ends if you drop to 0 Hit Points or if you and the target
--    become separated by more than 60 feet. It also ends if the spell is
--    cast again on either of the connected creatures."

let DiceDelta : Type =
      { kind : Text, dice : Natural, dieSize : Natural, sign : Text }

let DamageTypeRef : Type = { kind : Text }

let Effect : Type =
      { kind : Text
      , damageType : Optional DamageTypeRef
      , delta : Optional DiceDelta
      , on : Optional (List Text)
      , amount : Optional Text
      }

let Trigger : Type = { kind : Text }

let Predicate : Type = { kind : Text }

let Operation : Type =
      { trigger : Trigger, predicate : Optional Predicate, effect : Effect }

let noneDamageType = None DamageTypeRef

let noneDelta = None DiceDelta

let noneRollKinds = None (List Text)

let noneAmount = None Text

let plusOne : DiceDelta =
      { kind = "fixed_dice", dice = 1, dieSize = 1, sign = "+" }

let attachedBondWithinRange : Predicate =
      { kind = "attached_bond_within_range" }

let rangeGated =
      \(effect : Effect) ->
        { trigger = { kind = "passive" }
        , predicate = Some attachedBondWithinRange
        , effect
        }

let acBonus : Effect =
      { kind = "modify_ac"
      , damageType = noneDamageType
      , delta = Some plusOne
      , on = noneRollKinds
      , amount = noneAmount
      }

let saveBonus : Effect =
      { kind = "modify_roll_numeric"
      , damageType = noneDamageType
      , delta = Some plusOne
      , on = Some [ "saving_throw" ]
      , amount = noneAmount
      }

let allDamageResistance : Effect =
      { kind = "grant_resistance"
      , damageType = Some { kind = "all_damage_types" }
      , delta = noneDelta
      , on = noneRollKinds
      , amount = noneAmount
      }

let shareDamageToCaster : Effect =
      { kind = "share_damage_to_caster"
      , damageType = noneDamageType
      , delta = noneDelta
      , on = noneRollKinds
      , amount = Some "same_as_attached_damage_taken"
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
                  { kind = "paired_worn_items"
                  , itemKind = "ring"
                  , material = "platinum"
                  , minimumValueGpEach = 50
                  , wornBy = [ "caster", "target" ]
                  , requiredFor = "spell_duration"
                  }
              }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              , earlyEnd =
                  [ { kind = "caster_drops_to_0_hp" }
                  , { kind = "attached_bond_exceeds_range" }
                  , { kind = "spell_cast_again_on_connected_creature" }
                  ]
              }
          , attachment =
              { kind = "caster_target_bond"
              , bondId = "warding_bond_mystic_connection"
              , target =
                  { kind = "hole"
                  , holeId = "warding_bond_target"
                  , label = "willing creature"
                  , value =
                      { kind = "target"
                      , selection =
                          { mode = "one"
                          , targetKinds = [ "creature" ]
                          , disposition = "willing"
                          }
                      }
                  }
              , range = { kind = "within_feet", feet = 60 }
              }
          , operations =
              [ rangeGated acBonus
              , rangeGated saveBonus
              , rangeGated allDamageResistance
              , { trigger = { kind = "on_attached_damaged" }
                , predicate = None Predicate
                , effect = shareDamageToCaster
                }
              ] : List Operation
          }
      }

in  wardingBond
