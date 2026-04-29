-- Color Spray — SRD 5.2.1 Spell, level 1, Illusion.
--
-- RAW (Spells / Descriptions A-D / Color Spray):
--   "You launch a dazzling array of flashing, colorful light. Each
--    creature in a 15-foot Cone originating from you must succeed on
--    a Constitution saving throw or have the Blinded condition until
--    the end of your next turn."
--
-- ZERO-WIDENING VALIDATION REFERENCE. Cone AoE + self origin +
-- save_gate + on-fail apply_condition(blinded). Sub-agent had
-- originally proposed 3 widenings (cone shape, apply_condition in
-- Effect, end_of_next_turn expiry); all three are already in the
-- current surface.
--
-- RAW-vs-surface note: the spell's card Duration reads "Instantaneous"
-- but the Blinded condition lasts "until the end of your next turn."
-- Modeled as Duration.timed { unit=round, amount=1 } so the surface
-- carries the 1-round condition window. The caster-timeline vs
-- target-timeline distinction for turn-scoped expiry is session
-- bookkeeping (DM agenda per ARCHITECTURE.md §1).

let colorSpray =
      { kind = "spell"
      , id = "color_spray"
      , name = "Color Spray"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Color Spray"
          }
      , description =
          "You launch a dazzling array of flashing, colorful light. Each creature in a 15-foot Cone originating from you must succeed on a Constitution saving throw or have the Blinded condition until the end of your next turn."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "illusion"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components =
              { v = True
              , s = True
              , m = Some "a pinch of colorful sand"
              }
          , duration =
              { kind = "timed"
              , value = { unit = "round", amount = 1 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "area"
                    , shape = { kind = "cone", lengthFeet = 15 }
                    , origin = { kind = "self" }
                    }
                , ability = "con"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "apply_condition"
                    , condition = "blinded"
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  colorSpray
