-- Finger of Death — SRD 5.2.1 Spell, level 7, Necromancy.
-- Family: activation (single save_gate phase).
-- Target: one creature within 60 ft; Constitution save.
-- Fail: 7d8+30 Necrotic damage; Success: half (half_damage sentinel).
-- No upcast text in source.
--
-- The death aftermath is retained as a typed obligation; its execution owner
-- must reanimate a Humanoid killed by this spell on the caster's next turn.
--
-- "Half damage on success" uses the SaveSuccessOutcome `half_damage`
-- sentinel, which links to onFail.damage — no need to duplicate
-- 7d8+30 at 3d8+15 and hope the math stays honest.

let fingerOfDeath =
      { kind = "spell"
      , id = "finger_of_death"
      , name = "Finger of Death"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "spells.md#Finger of Death"
          }

      , mechanics =
          { family = "activation"
          , level = 7
          , school = "necromancy"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , deathAftermath =
              [ { kind = "reanimate_creature_killed_by_spell"
                , creatureType = "humanoid"
                , timing = "start_of_caster_next_turn"
                , statBlockId = "stat_block_zombie"
                , control = "caster_verbal_orders"
                }
              ]
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "finger_of_death_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , ability = "con"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "damage"
                    , damageType = "necrotic"
                    , amount =
                        { kind = "fixed"
                        , expr = { dice = 7, dieSize = 8, flat = 30 }
                        }
                    }
                , onSuccess = { kind = "half_damage" }
                }
              ]
          }
      }

in  fingerOfDeath
