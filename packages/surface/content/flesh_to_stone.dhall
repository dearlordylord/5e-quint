-- Flesh to Stone — SRD 5.2.1 Spell, level 6, Transmutation.
--
-- RAW (Spells/Descriptions-E-L#Flesh to Stone):
--   "The target makes a Constitution saving throw. On a failed save, it
--    has the Restrained condition for the duration. On a successful save,
--    its Speed is 0 until the start of your next turn. Constructs
--    automatically succeed on the save."
--   "A Restrained target makes another Constitution saving throw at the
--    end of each of its turns. If it successfully saves against this
--    spell three times, the spell ends. If it fails its saves three
--    times, it is turned to stone and has the Petrified condition for
--    the duration. The successes and failures needn't be consecutive..."
--   "If you maintain your Concentration on this spell for the entire
--    possible duration, the target is Petrified until the condition is
--    ended by Greater Restoration or similar magic."
--
-- PARTIAL: Construct auto-success is noted in text. The current save_gate
-- shape has no creature-type auto-success predicate.

let Child : Type =
      { kind : Text
      , condition : Optional Text
      , feet : Optional Natural
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , cadence : Optional Text
      , successCount : Optional Natural
      , failureCount : Optional Natural
      , onSuccessCount : Optional { kind : Text }
      , onFailureCount : Optional { kind : Text, condition : Text }
      , untilEndedBy : Optional Text
      }

let noneChild =
      { condition = None Text
      , feet = None Natural
      , ability = None Text
      , dc = None { kind : Text }
      , cadence = None Text
      , successCount = None Natural
      , failureCount = None Natural
      , onSuccessCount = None { kind : Text }
      , onFailureCount = None { kind : Text, condition : Text }
      , untilEndedBy = None Text
      }

let restrained : Child =
      noneChild // { kind = "apply_condition", condition = Some "restrained" }

let petrified : { kind : Text, condition : Text } =
      { kind = "apply_condition", condition = "petrified" }

let counter : Child =
      noneChild
        //  { kind = "repeat_save_counter"
            , condition = Some "restrained"
            , ability = Some "con"
            , dc = Some { kind = "caster_spell_save_dc" }
            , cadence = Some "end_of_target_turn"
            , successCount = Some 3
            , failureCount = Some 3
            , onSuccessCount = Some { kind = "end_current_effect" }
            , onFailureCount = Some petrified
            }

let persistentPetrification : Child =
      noneChild
        //  { kind = "condition_persists_after_full_duration"
            , condition = Some "petrified"
            , untilEndedBy = Some "greater_restoration_or_similar_magic"
            }

let Effect : Type =
      { kind : Text
      , condition : Optional Text
      , feet : Optional Natural
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , cadence : Optional Text
      , successCount : Optional Natural
      , failureCount : Optional Natural
      , onSuccessCount : Optional { kind : Text }
      , onFailureCount : Optional { kind : Text, condition : Text }
      , untilEndedBy : Optional Text
      , effects : Optional (List Child)
      }

let noneEffect =
      noneChild // { effects = None (List Child) }

let failEffect : Effect =
      noneEffect
        //  { kind = "composite"
            , effects = Some [ restrained, counter, persistentPetrification ]
            }

let speedZero : Effect =
      noneEffect // { kind = "set_speed", feet = Some 0 }

let fleshToStone =
      { kind = "spell"
      , id = "flesh_to_stone"
      , name = "Flesh to Stone"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Flesh to Stone"
          }
      , description =
          "You attempt to turn one creature that you can see within range into stone. The target makes a Constitution saving throw. On a failed save, it has the Restrained condition for the duration. On a successful save, its Speed is 0 until the start of your next turn. Constructs automatically succeed. A Restrained target repeats the Constitution save at the end of each of its turns. Three successes end the spell; three failures turn it to stone and give it the Petrified condition for the duration. If you maintain Concentration for the entire possible duration, the target is Petrified until ended by Greater Restoration or similar magic."
      , mechanics =
          { family = "activation"
          , level = 6
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = Some "a cockatrice feather" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "flesh_to_stone_target"
                    , label = "target creature"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , ability = "con"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail = failEffect
                , onSuccess = speedZero
                }
              ]
          }
      }

in  fleshToStone
