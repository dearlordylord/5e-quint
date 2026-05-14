-- Hex — SRD 5.2.1 Spell, level 1, Enchantment.
--
-- RAW (Spells/Descriptions-E-L#Hex):
--   "You place a curse on a creature that you can see within range."
--   "Until the spell ends, you deal an extra 1d6 Necrotic damage to
--    the target whenever you hit it with an attack roll."
--   "Choose one ability when you cast the spell. The target has
--    Disadvantage on ability checks made with the chosen ability."
--   "If the target drops to 0 Hit Points before this spell ends, you
--    can take a Bonus Action on a later turn to curse a new creature."
--   "Using a Higher-Level Spell Slot. Your Concentration can last
--    longer with a spell slot of level 2 (up to 4 hours), 3-4 (up to
--    8 hours), or 5+ (24 hours)."

let DiceAmount : Type =
      { kind : Text, expr : Optional { dice : Natural, dieSize : Natural } }

let AbilityChoice : Type =
      { kind : Text, label : Text, options : List Text }

let AbilityFilter : Type =
      { kind : Text
      , holeId : Text
      , label : Optional Text
      , value : AbilityChoice
      }

let Effect : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      , mode : Optional Text
      , affects : Optional Text
      , on : Optional (List Text)
      , abilityFilter : Optional AbilityFilter
      }

let necroticDamage : Effect =
      { kind = "damage"
      , damageType = Some "necrotic"
      , amount =
          Some
            { kind = "fixed"
            , expr = Some { dice = 1, dieSize = 6 }
            }
      , mode = None Text
      , affects = None Text
      , on = None (List Text)
      , abilityFilter = None AbilityFilter
      }

let cursedAbilityCheckDisadvantage : Effect =
      { kind = "modify_roll_advantage"
      , damageType = None Text
      , amount = None DiceAmount
      , mode = Some "disadvantage"
      , affects = Some "self_roll"
      , on = Some [ "ability_check" ]
      , abilityFilter =
          Some
            { kind = "hole"
            , holeId = "hex_cursed_ability"
            , label = Some "cursed ability"
            , value =
                { kind = "choice"
                , label = "cursed ability"
                , options = [ "str", "dex", "con", "int", "wis", "cha" ]
                }
            }
      }

let hex =
      { kind = "spell"
      , id = "hex"
      , name = "Hex"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Hex"
          }
      , description =
          "You place a curse on a creature that you can see within range. Until the spell ends, you deal an extra 1d6 Necrotic damage to the target whenever you hit it with an attack roll. Choose one ability when you cast the spell. The target has Disadvantage on ability checks made with the chosen ability. If the target drops to 0 Hit Points before this spell ends, you can take a Bonus Action on a later turn to curse a new creature. Using a Higher-Level Spell Slot. Your Concentration can last longer with a spell slot of level 2 (up to 4 hours), 3-4 (up to 8 hours), or 5+ (24 hours)."
      , mechanics =
          { family = "ongoing_effect"
          , level = 1
          , school = "enchantment"
          , castingTime = { kind = "bonus_action" }
          , range = { kind = "point", feet = 90 }
          , components =
              { v = True
              , s = True
              , m = Some "the petrified eye of a newt"
              }
          , duration =
              { kind = "concentration"
              , upTo =
                  { unit = "hour"
                  , amount = 1
                  , upcastTiers =
                      [ { atSlot = 2, amount = 4 }
                      , { atSlot = 3, amount = 8 }
                      , { atSlot = 5, amount = 24 }
                      ]
                  }
              }
          , attachment =
              { kind = "hole"
              , holeId = "hex_cursed_target"
              , label = "cursed target"
              , value =
                  { kind = "mark"
                  , selection =
                      { mode = "one", targetKinds = [ "creature" ] }
                  , transfer =
                      Some
                        { onEvent = { kind = "target_drops_to_0_hp" }
                        , availability =
                            { kind = "later_turn_after_trigger" }
                        , cost = { kind = "bonus_action" }
                        }
                  }
              }
          , operations =
              [ { trigger = { kind = "on_caster_attack_hit" }
                , effect = necroticDamage
                }
              , { trigger = { kind = "passive" }
                , effect = cursedAbilityCheckDisadvantage
                }
              ]
          }
      }

in  hex
