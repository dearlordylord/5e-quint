-- Tome of Understanding — SRD 5.2.1 magic item (wondrous, very rare).
--
-- RAW:
--   "If you spend 48 hours over a period of 6 days or fewer studying
--    the book's contents and practicing its guidelines, your Wisdom
--    increases by 2, to a maximum of 30. The manual then loses its
--    magic, but regains it in a century."
--
-- Encoding:
--   • Activated magic item gated by a study window rather than an
--     action economy cost.
--   • One use per century via use_count + elapsed_days reset.
--   • Permanent score increase as modify_ability_score with max 30.

let tome =
      { kind = "magic_item"
      , id = "magic_item_tome_of_understanding"
      , name = "Tome of Understanding"
      , rarity = "very_rare"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#TomeOfUnderstanding"
          }
      , description =
          "This book contains intuition and insight exercises, and its words are charged with magic. If you spend 48 hours over a period of 6 days or fewer studying the book's contents and practicing its guidelines, your Wisdom increases by 2, to a maximum of 30. The manual then loses its magic, but regains it in a century."
      , mechanics =
          { family = "activation"
          , activationCost =
              { kind = "study"
              , hours = 48
              , withinDays = 6
              }
          , resource =
              { kind = "use_count"
              , cap = { kind = "fixed", uses = 1 }
              }
          , resetCadence =
              { kind = "elapsed_days"
              , days = 36500
              , regain =
                  None
                    { kind : Text
                    , expr :
                        { dice : Natural
                        , dieSize : Natural
                        , flat : Optional Natural
                        , spellcastingMod : Optional Bool
                        }
                    }
              , startsWhen = "resource_spent"
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "modify_ability_score"
                      , ability = "wis"
                      , delta = +2
                      , maximum = Some 30
                      }
                    ]
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  tome
