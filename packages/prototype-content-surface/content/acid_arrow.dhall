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
-- The miss-branch phrase "half as much of the initial damage only" is
-- interpreted as "half of the base on-hit damage, dealt immediately
-- with no deferred follow-up". The "only" caps the miss branch — no
-- deferred second tick. Upcast scales both the hit-deferred and the
-- miss-immediate amounts; the miss branch here encodes the base 2d4
-- without per-slot scaling — refining the half-of-scaled amount is
-- deferred until a second spell with the same half-on-miss shape
-- surfaces (no second feature of that shape exists yet).

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
                    { kind = "target"
                    , selection = { mode = "one" }
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
