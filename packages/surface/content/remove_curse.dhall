-- Remove Curse - SRD 5.2.1 Spell, level 3, Abjuration.
--
-- RAW (Spells/Descriptions-Q-R#Remove Curse):
--   "At your touch, all curses affecting one creature or object end."
--   "If the object is a cursed magic item, its curse remains, but the spell
--    breaks its owner's Attunement to the object so it can be removed or
--    discarded."
--
-- The Rules Glossary says curses are defined by the effect that confers them,
-- and the Gameplay Toolbox leaves some curse-removal outcomes to GM judgment.
-- Bestow Curse now exposes a shared all-curses-ending removal boundary on its
-- curse occurrence. This Spell Definition preserves Remove Curse's SRD source
-- facts and target shape without claiming executable battle-runtime curse
-- cleanup or cursed-item Attunement mutation.

let removeCurse =
      { kind = "spell"
      , id = "remove_curse"
      , name = "Remove Curse"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-Q-R#Remove Curse"
          }
      , description =
          "At your touch, all curses affecting one creature or object end. If the object is a cursed magic item, its curse remains, but the spell breaks its owner's Attunement to the object so it can be removed or discarded."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "remove_curse_target"
                    , label = "creature or object"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one"
                            , targetKinds = [ "creature", "object" ]
                            }
                        }
                    }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  removeCurse
