-- Acid Arrow — SRD 5.2.1 Spell, level 2, Evocation (Wizard).
--
-- RAW (Spells / Descriptions A-D / Acid Arrow):
--   "A shimmering green arrow streaks toward a target within range and
--    bursts in a spray of acid. Make a ranged spell attack against the
--    target. On a hit, the target takes 4d4 Acid damage at the end of
--    its next turn. On a miss, the arrow splashes the target with acid
--    for half as much of the initial damage only."
--   "Using a Higher-Level Spell Slot. The damage (both initial and
--    later) increases by 1d4 for each spell slot level above 2."
--
-- Consolidated validation reference for:
--   • DamageEffectAtom.timing = "end_of_next_turn" (deferred damage)
--
-- L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE reviewed this local
-- RAW and found an unresolved corpus contradiction: the miss and
-- higher-slot clauses refer to initial damage, but the hit branch in
-- this corpus states only later damage at the end of the target's next
-- turn. Until the RAW corpus or ASSUMPTIONS.md resolves that initial
-- damage relationship, this record must not be admitted as a runtime
-- source for immediate hit damage or scaled half-on-miss damage.

let acidArrow =
      { kind = "spell"
      , id = "acid_arrow"
      , name = "Acid Arrow"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Acid Arrow"
          }
      , description =
          "A shimmering green arrow streaks toward a target within range and bursts in a spray of acid. Make a ranged spell attack against the target. On a hit, the target takes 4d4 Acid damage at the end of its next turn. On a miss, the arrow splashes the target with acid for half as much of the initial damage only. Using a Higher-Level Spell Slot. The damage (both initial and later) increases by 1d4 for each spell slot level above 2."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 90 }
          , components =
              { v = True
              , s = True
              , m = Some "powdered rhubarb leaf"
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "attack_roll"
                , attachment =
                    { kind = "hole"
                    , holeId = "acid_arrow_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , attackKind = "ranged_spell_attack"
                , onHit =
                    [ { kind = "damage"
                      , damageType = "acid"
                      , amount =
                          { kind = "linear_per_level"
                          , axis = "slot"
                          , base = { dice = 4, dieSize = 4 }
                          , perLevel = { dice = 1 }
                          , startingAtLevel = 2
                          }
                      , timing = "end_of_next_turn"
                      }
                    ]
                , onMiss =
                    [ { kind = "damage"
                      , damageType = "acid"
                      , amount =
                          { kind = "fixed"
                          , expr = { dice = 2, dieSize = 4, flat = 0 }
                          }
                      }
                    ]
                }
              ]
          }
      }

in  acidArrow
