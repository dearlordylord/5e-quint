-- Dissonant Whispers - SRD 5.2.1 Spell, level 1, Enchantment.
--
-- RAW (Spells / Descriptions A-D / Dissonant Whispers):
--   "The target makes a Wisdom saving throw. On a failed save, it
--    takes 3d6 Psychic damage and must immediately use its Reaction,
--    if available, to move as far away from you as it can, using the
--    safest route. On a successful save, the target takes half as much
--    damage only."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d6 for
--    each spell slot level above 1."
--
-- SURFACE WIDENING REFERENCE (SRDINV43). The forced_reaction_movement
-- atom records the Reaction-costed movement grammar and no-Reaction
-- fallback. Route derivation, pathfinding, and Opportunity Attack
-- derivation remain table/runtime-owned.
let dissonantWhispers =
      { kind = "spell"
      , id = "dissonant_whispers"
      , name = "Dissonant Whispers"
      , provenance =
        { kind = "srd-5.2.1"
        , section = "Spells/Descriptions-A-D#Dissonant Whispers"
        }
      , description =
          "One creature of your choice that you can see within range hears a discordant melody in its mind. The target makes a Wisdom saving throw. On a failed save, it takes 3d6 Psychic damage and must immediately use its Reaction, if available, to move as far away from you as it can, using the safest route. On a successful save, the target takes half as much damage only. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 1."
      , mechanics =
        { family = "activation"
        , level = 1
        , school = "enchantment"
        , castingTime.kind = "action"
        , range = { kind = "point", feet = 60 }
        , components = { v = True, s = False, m = False }
        , duration.kind = "instantaneous"
        , phases =
            let FailRider
                : Type
                = { kind : Text
                  , damageType : Optional Text
                  , amount :
                      Optional
                        { kind : Text
                        , axis : Text
                        , base : { dice : Natural, dieSize : Natural }
                        , perLevel : { dice : Natural }
                        , startingAtLevel : Natural
                        }
                  , cost : Optional Text
                  , unavailable : Optional Text
                  , distance : Optional Text
                  , direction : Optional Text
                  , route : Optional Text
                  }

            let damageRider
                : FailRider
                = { kind = "damage"
                  , damageType = Some "psychic"
                  , amount = Some
                    { kind = "linear_per_level"
                    , axis = "slot"
                    , base = { dice = 3, dieSize = 6 }
                    , perLevel.dice = 1
                    , startingAtLevel = 1
                    }
                  , cost = None Text
                  , unavailable = None Text
                  , distance = None Text
                  , direction = None Text
                  , route = None Text
                  }

            let movementRider
                : FailRider
                = { kind = "forced_reaction_movement"
                  , damageType = None Text
                  , amount =
                      None
                        { kind : Text
                        , axis : Text
                        , base : { dice : Natural, dieSize : Natural }
                        , perLevel : { dice : Natural }
                        , startingAtLevel : Natural
                        }
                  , cost = Some "target_reaction_if_available"
                  , unavailable = Some "no_movement"
                  , distance = Some "as_far_as_possible"
                  , direction = Some "away_from_caster"
                  , route = Some "safest_available"
                  }

            in  [ { kind = "save_gate"
                  , attachment =
                    { kind = "hole"
                    , holeId = "dissonant_whispers_target"
                    , label = "target"
                    , value =
                      { kind = "target"
                      , selection =
                        { mode = "one", targetKinds = [ "creature" ] }
                      }
                    }
                  , ability = "wis"
                  , dc.kind = "caster_spell_save_dc"
                  , onFail =
                    { kind = "composite"
                    , effects = [ damageRider, movementRider ]
                    }
                  , onSuccess.kind = "half_damage"
                  }
                ]
        }
      }

in  dissonantWhispers
