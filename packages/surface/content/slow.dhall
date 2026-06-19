-- Slow - SRD 5.2.1 Spell, level 3, Transmutation.
--
-- RAW (Spells/Descriptions-S-Z#Slow):
--   "You alter time around up to six creatures of your choice in a
--    40-foot Cube within range. Each target must succeed on a Wisdom
--    saving throw or be affected by this spell for the duration."
--   "An affected target's Speed is halved, it takes a -2 penalty to
--    AC and Dexterity saving throws, and it can't take Reactions."
--   "On its turns, it can take either an action or a Bonus Action,
--    not both, and it can make only one attack if it takes the Attack
--    action."
--   "If it casts a spell with a Somatic component, there is a 25
--    percent chance the spell fails as a result of the target making
--    the spell's gestures too slowly."
--   "An affected target repeats the save at the end of each of its
--    turns, ending the spell on itself on a success."
--
-- Runtime boundary: this Spell Definition records the authored save-gated
-- active penalty facts. Promoted runtime support is split between active
-- Speed/AC/Dexterity Saving Throw/Reaction/repeat-save projection and
-- target-turn/Somatic spell-failure execution.

let DiceDelta : Type =
      { kind : Text, amount : Natural, sign : Text }

let minusTwo : DiceDelta =
      { kind = "fixed_number", amount = 2, sign = "-" }

let SlowEffect : Type =
      { kind : Text
      , numerator : Optional Natural
      , denominator : Optional Natural
      , delta : Optional DiceDelta
      , on : Optional (List Text)
      , abilityFilter : Optional (List Text)
      , actions : Optional (List Text)
      , maxAttacks : Optional Natural
      , percent : Optional Natural
      }

let noSlowEffectFields : SlowEffect =
      { kind = ""
      , numerator = None Natural
      , denominator = None Natural
      , delta = None DiceDelta
      , on = None (List Text)
      , abilityFilter = None (List Text)
      , actions = None (List Text)
      , maxAttacks = None Natural
      , percent = None Natural
      }

let speedHalved : SlowEffect =
      noSlowEffectFields
        //  { kind = "set_speed_ratio"
            , numerator = Some 1
            , denominator = Some 2
            }

let armorClassPenalty : SlowEffect =
      noSlowEffectFields
        //  { kind = "modify_ac", delta = Some minusTwo }

let dexteritySavingThrowPenalty : SlowEffect =
      noSlowEffectFields
        //  { kind = "modify_roll_numeric"
            , on = Some [ "saving_throw" ]
            , abilityFilter = Some [ "dex" ]
            , delta = Some minusTwo
            }

let noReactions : SlowEffect =
      noSlowEffectFields
        //  { kind = "restrict_action_usage", actions = Some [ "reaction" ] }

let actionOrBonusAction : SlowEffect =
      noSlowEffectFields
        //  { kind = "choose_action_or_bonus_action_each_turn" }

let oneAttackWithAttackAction : SlowEffect =
      noSlowEffectFields
        //  { kind = "cap_attack_action_attacks", maxAttacks = Some 1 }

let somaticSpellFailure : SlowEffect =
      noSlowEffectFields
        //  { kind = "somatic_spell_failure_chance", percent = Some 25 }

let failedSave =
      { kind = "composite"
      , effects =
          [ speedHalved
          , armorClassPenalty
          , dexteritySavingThrowPenalty
          , noReactions
          , actionOrBonusAction
          , oneAttackWithAttackAction
          , somaticSpellFailure
          ]
      }

let slow =
      { kind = "spell"
      , id = "slow"
      , name = "Slow"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Slow"
          }
      , description =
          "You alter time around up to six creatures of your choice in a 40-foot Cube within range. Each target must succeed on a Wisdom saving throw or be affected by this spell for the duration. An affected target's Speed is halved, it takes a -2 penalty to AC and Dexterity saving throws, and it can't take Reactions. On its turns, it can take either an action or a Bonus Action, not both, and it can make only one attack if it takes the Attack action. If it casts a spell with a Somatic component, there is a 25 percent chance the spell fails as a result of the target making the spell's gestures too slowly. An affected target repeats the save at the end of each of its turns, ending the spell on itself on a success."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = Some "a drop of molasses" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "slow_cube"
                    , label = "spell cube"
                    , value =
                        { kind = "area"
                        , shape = { kind = "cube", sideFeet = 40 }
                        , origin = { kind = "point_within_range" }
                        , selection =
                            { mode = "choose_up_to"
                            , count = 6
                            , targetKinds = [ "creature" ]
                            }
                        }
                    }
                , ability = "wis"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail = failedSave
                , onSuccess = { kind = "none" }
                , repeatSaves =
                    [ { cadence = "end_of_target_turn"
                      , onSuccess = "ends_on_target"
                      }
                    ]
                }
              ]
          }
      }

in  slow
