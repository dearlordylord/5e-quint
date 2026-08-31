-- Word of Recall - SRD 5.2.1 Spell, level 6, Conjuration.
--
-- RAW (Spells/Descriptions-S-Z#Word of Recall): the caster and up to five
-- willing nearby creatures teleport to a previously designated sanctuary.
-- Sanctuary preparation and destination placement remain table-owned.

let wordOfRecall =
      { kind = "spell"
      , id = "word_of_recall"
      , name = "Word of Recall"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Word of Recall"
          }
      , mechanics =
          { family = "activation"
          , level = 6
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 5 }
          , components = { v = True, s = False, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  wordOfRecall
