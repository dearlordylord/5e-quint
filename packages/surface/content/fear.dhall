-- Fear — SRD 5.2.1 Spell, level 3, Illusion.
--
-- RAW (Spells / Descriptions E-L / Fear):
--   "Each creature in a 30-foot Cone must succeed on a Wisdom saving
--    throw or drop whatever it is holding and have the Frightened
--    condition for the duration."
--   "A Frightened creature takes the Dash action and moves away from
--    you by the safest route on each of its turns unless there is
--    nowhere to move. If the creature ends its turn in a space where
--    it doesn't have line of sight to you, the creature makes a
--    Wisdom saving throw. On a successful save, the spell ends on
--    that creature."
--
-- PARTIAL AUTHOR. save_gate Wis → apply_condition Frightened, cone
-- emanation from caster. Concentration 1 minute bounds the condition.
--
-- DEFERRED.
--   1. "drop whatever it is holding" — object-drop is a world-object
--      state mutation (§B world-object agenda, sibling to Fire Bolt's
--      "flammable object ignites" clause).
--   2. "takes the Dash action and moves away by the safest route" —
--      Frightened-enforced movement is condition-runtime behavior
--      already baked into the Frightened condition semantics
--      (Rules-Glossary); spatial routing is §B DM agenda.
--   3. "If it ends its turn in a space without line of sight to you,
--      repeat the save; on success, spell ends on that creature" —
--      line-of-sight is §B perception agenda. The end-of-turn repeat
--      save cadence itself is already expressible via repeatSaves, but
--      the LoS predicate gates it — omit until perception is modeled.

let fear =
      { kind = "spell"
      , id = "fear"
      , name = "Fear"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Fear"
          }
      , description =
          "Each creature in a 30-foot Cone must succeed on a Wisdom saving throw or drop whatever it is holding and have the Frightened condition for the duration. A Frightened creature takes the Dash action and moves away from you by the safest route on each of its turns unless there is nowhere to move. If the creature ends its turn in a space where it doesn't have line of sight to you, the creature makes a Wisdom saving throw. On a successful save, the spell ends on that creature."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "illusion"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components =
              { v = True
              , s = True
              , m = Some "a white feather"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "area"
                    , shape = { kind = "cone", lengthFeet = 30 }
                    , origin = { kind = "self" }
                    }
                , ability = "wis"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "apply_condition"
                    , condition = "frightened"
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  fear
