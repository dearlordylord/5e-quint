-- Web — SRD 5.2.1 Spell, Level 2, Conjuration.
-- Family: ongoing_effect, turn-start Dex save → Restrained.
-- §A15-unlocked partial.
--
-- PARTIAL.
--   • Difficult Terrain and Lightly Obscured are caller-owned
--     movement geometry / visibility per ARCHITECTURE.md §1.
--   • "The first time a creature enters the webs on a turn or starts
--     its turn there" — RAW triggers on BOTH entry and turn-start.
--     Encoded as on_attached_turn_start only; on_creature_enters_area
--     sibling not yet composed as a second operation because the
--     "first time per turn" dedup predicate is not modeled.
--   • "A creature Restrained by the webs can take an action to make
--     a Strength (Athletics) check against your spell save DC" —
--     player-initiated escape check. Not an ongoing trigger; action
--     economy + ability check resolution owned by the caller.
--   • "The webs are flammable … 2d4 Fire damage to any creature that
--     starts its turn in the fire" — environmental damage gated by a
--     caller-owned fire-interaction predicate. DM agenda.
--   • "If the webs aren't anchored between two solid masses … the
--     spell ends at the start of your next turn" — spatial anchor
--     predicate is caller-owned geometry.

let web =
      { kind = "spell"
      , id = "web"
      , name = "Web"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Web"
          }
      , description =
          "You conjure a mass of sticky webbing at a point within range. The webs fill a 20-foot Cube there for the duration. The webs are Difficult Terrain, and the area within them is Lightly Obscured. The first time a creature enters the webs on a turn or starts its turn there, it must succeed on a Dexterity saving throw or have the Restrained condition while in the webs or until it breaks free. A creature Restrained by the webs can take an action to make a Strength (Athletics) check against your spell save DC; on success it is no longer Restrained."
      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = Some "a bit of spiderweb" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "hour", amount = 1 }
              }
          , attachment =
              { kind = "hole"
              , holeId = "web_point"
              , label = "spell origin point"
              , value =
                  { kind = "area"
                  , shape = { kind = "cube", sideFeet = 20 }
                  , origin = { kind = "point_within_range" }
                  }
              }
          , operations =
              [ { trigger = { kind = "on_attached_turn_start" }
                , effect =
                    { kind = "save_gate"
                    , ability = "dex"
                    , dc = { kind = "caster_spell_save_dc" }
                    , onFail =
                        { kind = "apply_condition"
                        , condition = "restrained"
                        }
                    , onSuccess = { kind = "none" }
                    }
                }
              ]
          }
      }

in  web
