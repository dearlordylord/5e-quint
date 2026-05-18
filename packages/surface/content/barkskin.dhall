-- Barkskin — SRD 5.2.1 Spell, level 2, Transmutation.
--
-- RAW (Spells / Descriptions A-D / Barkskin):
--   "You touch a willing creature. Until the spell ends, the target's
--    skin assumes a bark-like appearance, and the target has an
--    Armor Class of 17 if its AC is lower than that."
--
-- Consolidated validation reference for:
--   • ModifyAcOngoingOperation.modify_ac_set_floor (new widening —
--     AC = max(current_ac, 17). Distinct from modify_ac_set_base
--     (Mage Armor: REPLACES base AC) and from EffectAtom.modify_ac
--     (additive DiceDelta, Ring of Protection).)

let barkskin =
      { kind = "spell"
      , id = "barkskin"
      , name = "Barkskin"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Barkskin"
          }
      , description =
          "You touch a willing creature. Until the spell ends, the target's skin assumes a bark-like appearance, and the target has an Armor Class of 17 if its AC is lower than that."
      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "transmutation"
          , castingTime = { kind = "bonus_action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "a handful of bark"
              }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              }
          , attachment =
              { kind = "hole"
              , holeId = "barkskin_target"
              , label = "willing target"
              , value =
                  { kind = "target"
                  , selection =
                      { mode = "one"
                      , targetKinds = [ "creature" ]
                      , disposition = "willing"
                      }
                  }
              }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect =
                    { kind = "modify_ac_set_floor"
                    , const = 17
                    }
                }
              ]
          }
      }

in  barkskin
