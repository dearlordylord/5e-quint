-- Shield — SRD 5.2.1 Spell, level 1, Abjuration.
-- Family: triggered_reaction.
-- Trigger: any_of [hit_by_attack_roll, targeted_by_named_spell("magic_missile")]
-- Effects: +5 AC (modify_ac) + negate Magic Missile damage (negate_named_effect)
-- Duration: 1 round (timed) — until start of next turn
--
-- DHALL NOTE:
--   The `triggers` list and `effects` list require heterogeneous records.
--   Dhall's homogeneous list constraint is satisfied with Optional fields;
--   dhall-to-json renders None T as null and the tracer dispatches on `kind` only.

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
                        }
                      , { kind = "targeted_by_named_spell"
                        , spellId = Some "magic_missile"
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
          , attachment = { kind = "self" }
          , interruptsTrigger = True
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
      }

in  shield
