-- Mind Spike — SRD 5.2.1 Spell, level 2, Divination.
--
-- RAW (Spells / Descriptions M-P / Mind Spike):
--   "You drive a spike of psionic energy into the mind of one creature
--    you can see within range. The target makes a Wisdom saving throw,
--    taking 3d8 Psychic damage on a failed save or half as much damage
--    on a successful one. On a failed save, you also always know the
--    target's location until the spell ends, but only while the two of
--    you are on the same plane of existence. While you have this
--    knowledge, the target can't become hidden from you, and if it has
--    the Invisible condition, it gains no benefit from that condition
--    against you."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d8 for
--    each spell slot level above 2."
--
-- PARTIAL AUTHOR. save_gate Wis -> psychic damage, half on success.
-- Damage scales 1d8 per slot above 2. The runtime owns the
-- failed-save Concentration lock and its one-hour maximum through a
-- duration-only concentration anchor; successful saves spend the slot
-- and deal half damage without starting the location-knowledge spell
-- effect. The table/perception owner owns same-plane location
-- knowledge, Hidden prevention, and Invisible benefit denial while the
-- spell remains active.
--
-- RUNTIME-DETACHED CLOSURE.
--   1. "you also always know the target's location until the spell
--      ends" -- remote-location sensing / target-tracking is table
--      knowledge outside promoted battle execution.
--   2. "the target can't become hidden from you" and "Invisible gains
--      no benefit against you" -- perception / visibility overrides are
--      table/perception facts outside promoted battle execution.

let mindSpike =
      { kind = "spell"
      , id = "mind_spike"
      , name = "Mind Spike"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Mind Spike"
          }
      , description =
          "You drive a spike of psionic energy into the mind of one creature you can see within range. The target makes a Wisdom saving throw, taking 3d8 Psychic damage on a failed save or half as much damage on a successful one. On a failed save, you also always know the target's location until the spell ends, but only while the two of you are on the same plane of existence. While you have this knowledge, the target can't become hidden from you, and if it has the Invisible condition, it gains no benefit from that condition against you. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 2."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "divination"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = False, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "hour", amount = 1 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "mind_spike_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , ability = "wis"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "damage"
                    , damageType = "psychic"
                    , amount =
                        { kind = "linear_per_level"
                        , axis = "slot"
                        , base = { dice = 3, dieSize = 8 }
                        , perLevel = { dice = 1 }
                        , startingAtLevel = 2
                        }
                    }
                , onSuccess = { kind = "half_damage" }
                }
              ]
          }
      }

in  mindSpike
