-- Chain Lightning — SRD 5.2.1 Spell, level 6, Evocation.
--
-- RAW (Spells / Descriptions A-D / Chain Lightning):
--   "You launch a lightning bolt toward a target you can see within
--    range. Three bolts then leap from that target to as many as three
--    other targets of your choice, each of which must be within 30
--    feet of the first target. A target can be a creature or an object
--    and can be targeted by only one of the bolts.
--    Each target makes a Dexterity saving throw, taking 10d8 Lightning
--    damage on a failed save or half as much damage on a successful
--    one."
--   "Using a Higher-Level Spell Slot. One additional bolt leaps from
--    the first target to another target for each spell slot level
--    above 6."
--
-- Consolidated validation reference for:
--   • Single-phase save_gate with choose_up_to (up to 4 creatures at
--     base; +1 per slot above 6). Default-absent repeatsAllowed gives
--     the "only one of the bolts" distinctness rule for free.
--
-- SPATIAL / DM-AGENDA. The "primary target, then secondaries within
-- 30 feet of it" geometry is spatial (distance / adjacency). Per
-- ARCHITECTURE.md §1, spatial relationships are caller-provided
-- inputs, not owned by the spec. The session resolves whether a
-- chosen set of ≤4 creatures satisfies the geometry; the content
-- surface only declares "up to N targets, DEX save, 10d8 Lightning."
-- This collapses an earlier two-phase model (primary + secondaries
-- with a within_of_primary eligibility predicate) into Bless's shape.

let chainLightning =
      { kind = "spell"
      , id = "chain_lightning"
      , name = "Chain Lightning"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Chain Lightning"
          }
      , description =
          "You launch a lightning bolt toward a target you can see within range. Three bolts then leap from that target to as many as three other targets of your choice, each of which must be within 30 feet of the first target. A target can be a creature or an object and can be targeted by only one of the bolts. Each target makes a Dexterity saving throw, taking 10d8 Lightning damage on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. One additional bolt leaps from the first target to another target for each spell slot level above 6."
      , mechanics =
          { family = "activation"
          , level = 6
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 150 }
          , components =
              { v = True
              , s = True
              , m = Some "three silver pins"
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "target"
                    , selection =
                        { mode = "choose_up_to"
                        , count =
                            { kind = "linear"
                            , base = 4
                            , perSlotAboveBase = 1
                            , baseLevel = 6
                            }
                        }
                    }
                , ability = "dex"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "damage"
                    , damageType = "lightning"
                    , amount =
                        { kind = "fixed"
                        , expr = { dice = 10, dieSize = 8 }
                        }
                    }
                , onSuccess = { kind = "half_damage" }
                }
              ]
          }
      }

in  chainLightning
