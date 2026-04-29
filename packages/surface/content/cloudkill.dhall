-- Cloudkill — SRD 5.2.1 Spell, Level 5, Conjuration.
-- Family: ongoing_effect. §A15 validation ref for
-- `on_attached_turn_start` save_gate with slot-scaled damage.
--
-- PARTIAL:
--   • Per-turn Con save inside the sphere is authored below. RAW also
--     triggers the save on initial cast, on entering the sphere, and
--     on the sphere moving into a creature's space. The single
--     OngoingOperation slot forces a choice — encoded here as
--     on_attached_turn_start per the handoff convention; the
--     on_creature_enters_area sibling trigger and the initial-cast
--     save (activation-family shape) are DEFERRED pending
--     multi-operation widening.
--   • "The Sphere moves 10 feet away from you at the start of each
--     of your turns" is area movement — caller-owned geometry per
--     ARCHITECTURE.md §1.
--   • "Dispersed by strong wind (such as Gust of Wind)" is an
--     early-end trigger that requires a caller-resolved weather
--     predicate; DM agenda.
--   • "Heavily Obscured" is caller-owned visibility.

let cloudkill =
      { kind = "spell"
      , id = "cloudkill"
      , name = "Cloudkill"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Cloudkill"
          }
      , description =
          "You create a 20-foot-radius Sphere of yellow-green fog centered on a point within range. The fog lasts for the duration or until strong wind disperses it. Its area is Heavily Obscured. Each creature in the Sphere makes a Constitution saving throw, taking 5d8 Poison damage on a failed save or half as much damage on a successful one. A creature must also make this save when the Sphere moves into its space and when it enters the Sphere or ends its turn there. A creature makes this save only once per turn. The Sphere moves 10 feet away from you at the start of each of your turns."
      , mechanics =
          { family = "ongoing_effect"
          , level = 5
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , attachment =
              { kind = "hole"
              , holeId = "cloudkill_point"
              , label = "spell origin point"
              , value =
                  { kind = "area"
                  , shape = { kind = "sphere", radiusFeet = 20 }
                  , origin = { kind = "point_within_range" }
                  }
              }
          , initialPhase =
              { kind = "save_gate"
              , attachment =
                  { kind = "hole"
                  , holeId = "cloudkill_point"
                  , label = "spell origin point"
                  , value =
                      { kind = "area"
                      , shape = { kind = "sphere", radiusFeet = 20 }
                      , origin = { kind = "point_within_range" }
                      }
                  }
              , ability = "con"
              , dc = { kind = "caster_spell_save_dc" }
              , onFail =
                  { kind = "damage"
                  , damageType = "poison"
                  , amount =
                      { kind = "linear_per_level"
                      , axis = "slot"
                      , base = { dice = 5, dieSize = 8 }
                      , perLevel = { dice = 1 }
                      , startingAtLevel = 5
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
                        , damageType = "poison"
                        , amount =
                            { kind = "linear_per_level"
                            , axis = "slot"
                            , base = { dice = 5, dieSize = 8 }
                            , perLevel = { dice = 1 }
                            , startingAtLevel = 5
                            }
                        }
                    , onSuccess = { kind = "half_damage" }
                    }
                }
              ]
          }
      }

in  cloudkill
