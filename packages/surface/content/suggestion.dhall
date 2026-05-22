-- Suggestion - SRD 5.2.1 Spell, level 2, Enchantment.
--
-- RAW clauses (Spells/Descriptions-S-Z#Suggestion, punctuation normalized to
-- ASCII):
--   "You suggest a course of activity-described in no more than 25
--    words-to one creature you can see within range that can hear
--    and understand you."
--   "The suggestion must sound achievable and not involve anything
--    that would obviously deal damage to the target or its allies."
--   "The target must succeed on a Wisdom saving throw or have the
--    Charmed condition for the duration or until you or your allies
--    deal damage to the target."
--   "The Charmed target pursues the suggestion to the best of its
--    ability. The suggested activity can continue for the entire
--    duration, but if the suggested activity can be completed in a
--    shorter time, the spell ends for the target upon completing it."
--
-- Runtime boundary: the target's hearing, understanding, suggested
-- activity text, achievable/obvious-damage judgment, pursuit, and
-- completion are table/social facts. The Surface record keeps the
-- authored spell identity, target/save/Charmed condition facts, and
-- duration/damage-ending facts without promoting a battle-runtime
-- compliance owner.

let suggestion =
      { kind = "spell"
      , id = "suggestion"
      , name = "Suggestion"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Suggestion"
          }
      , description =
          "You suggest a course of activity - described in no more than 25 words - to one creature you can see within range that can hear and understand you. The suggestion must sound achievable and not involve anything that would obviously deal damage to the target or its allies. The target must succeed on a Wisdom saving throw or have the Charmed condition for the duration or until you or your allies deal damage to the target. The Charmed target pursues the suggestion to the best of its ability. The suggested activity can continue for the entire duration, but if the suggested activity can be completed in a shorter time, the spell ends for the target upon completing it."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = False, m = Some "a drop of honey" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "hour", amount = 8 }
              , earlyEnd =
                  [ { kind = "target_damaged_by_caster_or_ally" } ]
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "suggestion_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one", targetKinds = [ "creature" ] }
                        }
                    }
                , ability = "wis"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "apply_condition"
                    , condition = "charmed"
                    , duration = "spell_duration"
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  suggestion
