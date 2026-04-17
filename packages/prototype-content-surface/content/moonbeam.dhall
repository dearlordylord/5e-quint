-- Moonbeam — SRD 5.2.1 Spell, Level 2, Evocation.
-- Family: ongoing_effect with initialPhase (§A17b widening) — initial
-- Con save on cast + per-turn Con save in cylinder.
--
-- PARTIAL.
--   • "Shape-shifted creatures revert to their true form and can't
--     shape-shift until they leave the Cylinder" — revert-shape-
--     change atom not yet landed (couples with §C4d polymorph
--     family). Authored without the revert clause.
--   • "You can take a Magic action on later turns to move the
--     Cylinder up to 60 feet" — caller-owned area movement per
--     ARCHITECTURE.md §1.
--   • "Dim Light fills the Cylinder" — caller-owned visibility.

let moonbeam =
      { kind = "spell"
      , id = "moonbeam"
      , name = "Moonbeam"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Moonbeam"
          }
      , description =
          "A silvery beam of pale light shines down in a 5-foot-radius, 40-foot-high Cylinder centered on a point within range. Dim Light fills the Cylinder. When the Cylinder appears, each creature in it makes a Constitution saving throw, taking 2d10 Radiant damage on a failed save or half on success. A creature makes this save again when the spell's area moves into its space and when it enters the Cylinder or ends its turn there (once per turn)."
      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = Some "a moonseed leaf" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment =
              { kind = "area"
              , shape = { kind = "cylinder", radiusFeet = 5, heightFeet = 40 }
              , origin = { kind = "point_within_range" }
              }
          , initialPhase =
              { kind = "save_gate"
              , attachment =
                  { kind = "area"
                  , shape = { kind = "cylinder", radiusFeet = 5, heightFeet = 40 }
                  , origin = { kind = "point_within_range" }
                  }
              , ability = "con"
              , dc = { kind = "caster_spell_save_dc" }
              , onFail =
                  { kind = "damage"
                  , damageType = "radiant"
                  , amount =
                      { kind = "linear_per_level"
                      , axis = "slot"
                      , base = { dice = 2, dieSize = 10 }
                      , perLevel = { dice = 1 }
                      , startingAtLevel = 2
                      }
                  }
              , onSuccess = { kind = "half_damage" }
              }
          , operations =
              [ { trigger = { kind = "on_attached_turn_start" }
                , effect =
                    { kind = "save_gate"
                    , ability = "con"
                    , dc = { kind = "caster_spell_save_dc" }
                    , onFail =
                        { kind = "damage"
                        , damageType = "radiant"
                        , amount =
                            { kind = "linear_per_level"
                            , axis = "slot"
                            , base = { dice = 2, dieSize = 10 }
                            , perLevel = { dice = 1 }
                            , startingAtLevel = 2
                            }
                        }
                    , onSuccess = { kind = "half_damage" }
                    }
                }
              ]
          }
      }

in  moonbeam
