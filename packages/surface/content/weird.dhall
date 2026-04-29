-- Weird — SRD 5.2.1 Spell, level 9, Illusion.
--
-- RAW (Spells/Descriptions-S-Z#Weird):
--   "Each creature of your choice in a 30-foot-radius Sphere centered
--    on a point within range makes a Wisdom saving throw."
--   "On a failed save, a target takes 10d10 Psychic damage and has the
--    Frightened condition for the duration. On a successful save, a
--    target takes half as much damage only."
--   "A Frightened target makes a Wisdom saving throw at the end of each
--    of its turns. On a failed save, it takes 5d10 Psychic damage. On
--    a successful save, the spell ends on that target."

let DiceAmount : Type =
      { kind : Text, expr : { dice : Natural, dieSize : Natural, flat : Natural } }

let Leaf : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      , condition : Optional Text
      , duration : Optional Text
      }

let noneLeaf =
      { damageType = None Text
      , amount = None DiceAmount
      , condition = None Text
      , duration = None Text
      }

let psychicDamage =
      \(dice : Natural) ->
        noneLeaf
        //  { kind = "damage"
            , damageType = Some "psychic"
            , amount =
                Some
                  { kind = "fixed"
                  , expr = { dice = dice, dieSize = 10, flat = 0 }
                  }
            }

let frightened : Leaf =
      noneLeaf
        //  { kind = "apply_condition"
            , condition = Some "frightened"
            , duration = Some "spell_duration"
            }

let Effect : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      , condition : Optional Text
      , duration : Optional Text
      , effects : Optional (List Leaf)
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , onFail : Optional Leaf
      , onSuccess : Optional Leaf
      }

let noneEffect =
      noneLeaf
      //  { effects = None (List Leaf)
          , ability = None Text
          , dc = None { kind : Text }
          , onFail = None Leaf
          , onSuccess = None Leaf
          }

let initialFail : Effect =
      noneEffect
        //  { kind = "composite"
            , effects = Some [ psychicDamage 10, frightened ]
            }

let endCurrentEffect : Leaf =
      noneLeaf // { kind = "end_current_effect" }

let repeatFail : Leaf =
      psychicDamage 5

let area =
      { kind = "hole"
      , holeId = "weird_targets"
      , label = "chosen creatures in fear sphere"
      , value =
          { kind = "area"
          , shape = { kind = "sphere", radiusFeet = 30 }
          , origin = { kind = "point_within_range" }
          }
      }

let weird =
      { kind = "spell"
      , id = "weird"
      , name = "Weird"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Weird"
          }
      , description =
          "Each creature of your choice in a 30-foot-radius Sphere centered on a point within range makes a Wisdom saving throw. On a failed save, a target takes 10d10 Psychic damage and has the Frightened condition for the duration. On a successful save, a target takes half as much damage only. A Frightened target makes a Wisdom saving throw at the end of each of its turns. On a failed save, it takes 5d10 Psychic damage. On a successful save, the spell ends on that target."
      , mechanics =
          { family = "ongoing_effect"
          , level = 9
          , school = "illusion"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment = area
          , initialPhase =
              { kind = "save_gate"
              , attachment = area
              , ability = "wis"
              , dc = { kind = "caster_spell_save_dc" }
              , onFail = initialFail
              , onSuccess = { kind = "half_damage" }
              }
          , operations =
              [ { trigger = { kind = "on_attached_turn_end" }
                , predicate =
                    { kind = "has_condition", condition = "frightened" }
                , effect =
                    { kind = "save_gate"
                    , ability = "wis"
                    , dc = { kind = "caster_spell_save_dc" }
                    , onFail = repeatFail
                    , onSuccess = endCurrentEffect
                    }
                }
              ]
          }
      }

in  weird
