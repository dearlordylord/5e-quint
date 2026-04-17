-- Defense — SRD 5.2.1 Fighting Style feat.
-- Reference encoding for FeatRecord with a PassiveMechanics family
-- gated by an EquipmentPredicate (wearing_armor).
--
-- RAW: "While you're wearing Light, Medium, or Heavy armor, you gain a
-- +1 bonus to Armor Class."

let defense =
      { kind = "feat"
      , id = "defense"
      , name = "Defense"
      , category = "fighting_style"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Feats#Defense"
          }
      , description =
          "While you're wearing Light, Medium, or Heavy armor, you gain a +1 bonus to Armor Class."
      , mechanics =
          { family = "passive"
          , condition =
              { kind = "wearing_armor"
              , categories = [ "light", "medium", "heavy" ]
              }
          , grants =
              [ { kind = "modify_ac"
                , delta =
                    { kind = "fixed_dice"
                    , dice = 1
                    , dieSize = 1
                    , sign = "+"
                    }
                }
              ]
          }
      }

in  defense
