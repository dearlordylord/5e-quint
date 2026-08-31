-- Sleep — SRD 5.2.1 Spell, Level 1, Enchantment.
-- §C2 validation ref — two-stage escalating save chain via
-- RepeatSaveSpec.onFailAgain.
--
let FailureEffect =
      { kind : Text
      , condition : Optional Text
      , actor : Optional Text
      , cost : Optional Text
      , method : Optional Text
      , outcome : Optional Text
      }

let noFailureFields : FailureEffect =
      { kind = ""
      , condition = None Text
      , actor = None Text
      , cost = None Text
      , method = None Text
      , outcome = None Text
      }

let TargetPredicate =
      { kind : Text
      , condition : Optional Text
      }

let sleep =
      { kind = "spell"
      , id = "sleep"
      , name = "Sleep"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Sleep"
          }

      , mechanics =
          { family = "activation"
          , level = 1
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components =
              { v = True, s = True, m = Some "a pinch of sand or rose petals" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              , earlyEnd =
                  [ { kind = "target_takes_damage" }
                  ]
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "sleep_point"
                    , label = "spell origin point"
                    , value =
                        { kind = "area"
                        , shape = { kind = "sphere", radiusFeet = 5 }
                        , origin = { kind = "point_within_range" }
                        }
                    }
                , ability = "wis"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "composite"
                    , effects =
                        [ noFailureFields
                            //  { kind = "apply_condition"
                                , condition = Some "incapacitated"
                                }
                        , noFailureFields
                            //  { kind = "target_effect_escape_action"
                                , actor = Some "another_creature"
                                , cost = Some "action"
                                , method = Some "shake_awake"
                                , outcome = Some "end_current_effect"
                                }
                        ]
                    }
                , onSuccess = { kind = "none" }
                , autoSuccessIfTarget =
                    { kind = "any"
                    , predicates =
                        [ { kind = "does_not_sleep", condition = None Text }
                        , { kind = "has_condition_immunity"
                          , condition = Some "exhaustion"
                          }
                        ] : List TargetPredicate
                    }
                , repeatSaves =
                    [ { cadence = "end_of_target_turn"
                      , onSuccess = "ends_on_target"
                      , onFailAgain =
                          { kind = "apply_condition"
                          , condition = "unconscious"
                          }
                      }
                    ]
                }
              ]
          }
      }

in  sleep
