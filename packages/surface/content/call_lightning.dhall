-- Call Lightning — SRD 5.2.1 Spell, Level 3, Conjuration.
-- Family: ongoing_effect (concentration 10 min) with:
--   • initialPhase: Dex save (3d10 lightning, half on success) at cast time
--   • operation: on_caster_spends_action (Magic) → same Dex save
-- Upcast: +1d10 per slot above 3 (linear_per_level, axis=slot,
--   startingAtLevel=3, perLevel={dice=1}).
--
-- OMITTED (DM-agenda / environment):
--   "If you're outdoors in a storm when you cast this spell, the spell
--    gives you control over that storm instead of creating a new one.
--    Under such conditions, the spell's damage increases by 1d10."
--   The +1d10 outdoor-storm bonus is a DM-determined environmental state
--   with no deterministic trigger in the authored surface. Omitted per
--   ARCHITECTURE.md.
--
-- MODELING NOTE:
--   The spell's main attachment is the storm cloud cylinder (60 ft radius,
--   10 ft tall). Each lightning bolt targets creatures within 5 ft of "a
--   point you can see under the cloud." The initialPhase uses a sphere
--   (5 ft radius, point_within_range) as its own attachment to capture
--   that sub-area. The ongoing save_gate inherits the cloud attachment
--   as its host (per OngoingEffect.save_gate semantics — no own attachment).
--   This approximation is intentional: the 5 ft sub-targeting detail is
--   player-chosen at each activation and does not require a new atom.

let callLightning =
      { kind = "spell"
      , id = "call_lightning"
      , name = "Call Lightning"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Call Lightning"
          }
      , description =
          "A storm cloud appears at a point within range that you can see above yourself. It takes the shape of a Cylinder that is 10 feet tall with a 60-foot radius. When you cast the spell, choose a point you can see under the cloud. A lightning bolt shoots from the cloud to that point. Each creature within 5 feet of that point makes a Dexterity saving throw, taking 3d10 Lightning damage on a failed save or half as much damage on a successful one. Until the spell ends, you can take a Magic action to call down lightning in that way again, targeting the same point or a different one. Using a Higher-Level Spell Slot: The damage increases by 1d10 for each spell slot level above 3."
      , mechanics =
          { family = "ongoing_effect"
          , level = 3
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
              , holeId = "call_lightning_point"
              , label = "spell origin point"
              , value =
                  { kind = "area"
                  , shape = { kind = "cylinder", radiusFeet = 60, heightFeet = 10 }
                  , origin = { kind = "point_within_range" }
                  }
              }
          , initialPhase =
              { kind = "save_gate"
              , attachment =
                  { kind = "hole"
                  , holeId = "call_lightning_point"
                  , label = "spell origin point"
                  , value =
                      { kind = "area"
                      , shape = { kind = "sphere", radiusFeet = 5 }
                      , origin = { kind = "point_within_range" }
                      }
                  }
              , ability = "dex"
              , dc = { kind = "caster_spell_save_dc" }
              , onFail =
                  { kind = "damage"
                  , damageType = "lightning"
                  , amount =
                      { kind = "linear_per_level"
                      , axis = "slot"
                      , base = { dice = 3, dieSize = 10 }
                      , perLevel = { dice = 1 }
                      , startingAtLevel = 3
                      }
                  }
              , onSuccess = { kind = "half_damage" }
              }
          , operations =
              [ { trigger =
                    { kind = "on_caster_spends_action"
                    , cost = { kind = "standard_action", action = "magic" }
                    }
                , effect =
                    { kind = "save_gate"
                    , ability = "dex"
                    , dc = { kind = "caster_spell_save_dc" }
                    , onFail =
                        { kind = "damage"
                        , damageType = "lightning"
                        , amount =
                            { kind = "linear_per_level"
                            , axis = "slot"
                            , base = { dice = 3, dieSize = 10 }
                            , perLevel = { dice = 1 }
                            , startingAtLevel = 3
                            }
                        }
                    , onSuccess = { kind = "half_damage" }
                    }
                }
              ]
          }
      }

in  callLightning
