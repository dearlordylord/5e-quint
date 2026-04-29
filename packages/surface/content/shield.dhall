-- Shield — SRD 5.2.1 Spell, Level 1, Abjuration.
-- Family: triggered_reaction (unified §C1 — phases shape).
-- Trigger: any_of [hit_by_attack_roll, targeted_by_named_spell("magic_missile")]
-- Single `direct` phase: +5 AC + negate Magic Missile damage.

let shield =
      { kind = "spell"
      , id = "shield"
      , name = "Shield"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-Q-Z#Shield"
          }
      , description =
          "An imperceptible barrier of magical force protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from Magic Missile."
      , mechanics =
          { family = "triggered_reaction"
          , level = 1
          , school = "abjuration"
          , castingTime =
              { kind = "reaction"
              , trigger =
                  { kind = "any_of"
                  , triggers =
                      [ { kind = "hit_by_attack_roll"
                        , spellId = None Text
                        , components = None (List Text)
                        }
                      , { kind = "targeted_by_named_spell"
                        , spellId = Some "magic_missile"
                        , components = None (List Text)
                        }
                      ]
                  }
              }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "timed"
              , value = { unit = "round", amount = 1 }
              }
          , interruptsTrigger = True
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "modify_ac"
                      , delta =
                          Some
                            { kind = "fixed_dice"
                            , dice = 5
                            , dieSize = 1
                            , sign = "+"
                            }
                      , spellId = None Text
                      , scope = None Text
                      }
                    , { kind = "negate_named_effect"
                      , delta =
                          None
                            { kind : Text
                            , dice : Natural
                            , dieSize : Natural
                            , sign : Text
                            }
                      , spellId = Some "magic_missile"
                      , scope = Some "damage_only"
                      }
                    ]
                }
              ]
          }
      }

in  shield
