-- Animate Dead — SRD 5.2.1 Spell, Level 3, Necromancy.
-- §C4b validation ref — reanimated_creature family.
--
-- Per-slot menu: slot N animates (or reasserts control over) a
-- scaling count of Skeletons/Zombies. Base 1 at slot 3; +2 per slot
-- above. Reassert caps at 4 at slot 3; +2 per slot above.
--
-- PARTIAL.
--   • Distinction between "animate new" vs "reassert existing" is
--     caller-resolved — RAW states the same slot serves either
--     purpose. The menu records the count; reassertWindow bounds the
--     24-hour control cycle.

let animateDead =
      { kind = "spell"
      , id = "animate_dead"
      , name = "Animate Dead"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Animate Dead"
          }
      , description =
          "Choose a pile of bones or a corpse of a Medium or Small Humanoid within range. The target becomes a Skeleton if you chose bones or a Zombie if you chose a corpse. As a Bonus Action within 60 ft, issue commands. The creature is under your control for 24 hours; recast within that window to reassert control over up to four creatures. Higher-level slots animate or reassert two additional Undead per slot above 3."
      , mechanics =
          { family = "reanimated_creature"
          , level = 3
          , school = "necromancy"
          , castingTime = { kind = "minutes", amount = 1, ritual = False }
          , range = { kind = "point", feet = 10 }
          , components =
              { v = True
              , s = True
              , m = Some "a drop of blood, a piece of flesh, and a pinch of bone dust"
              }
          , duration = { kind = "instantaneous" }
          , targetKind = "corpse_or_bones_of_small_or_medium_humanoid"
          , menu =
              [ { slotLevel = 3
                , options =
                    [ { monsterId = "skeleton", count = 1 }
                    , { monsterId = "zombie", count = 1 }
                    ]
                }
              , { slotLevel = 4
                , options =
                    [ { monsterId = "skeleton", count = 3 }
                    , { monsterId = "zombie", count = 3 }
                    ]
                }
              , { slotLevel = 5
                , options =
                    [ { monsterId = "skeleton", count = 5 }
                    , { monsterId = "zombie", count = 5 }
                    ]
                }
              , { slotLevel = 6
                , options =
                    [ { monsterId = "skeleton", count = 7 }
                    , { monsterId = "zombie", count = 7 }
                    ]
                }
              , { slotLevel = 7
                , options =
                    [ { monsterId = "skeleton", count = 9 }
                    , { monsterId = "zombie", count = 9 }
                    ]
                }
              , { slotLevel = 8
                , options =
                    [ { monsterId = "skeleton", count = 11 }
                    , { monsterId = "zombie", count = 11 }
                    ]
                }
              , { slotLevel = 9
                , options =
                    [ { monsterId = "skeleton", count = 13 }
                    , { monsterId = "zombie", count = 13 }
                    ]
                }
              ]
          , control =
              { initiative = "own_roll"
              , commandCost = { kind = "bonus_action" }
              , commandRangeFeet = 60
              , defaultBehavior = "dodge_and_avoid"
              }
          , reassertWindow =
              { hours = 24
              , maxReassertPerCast = 4
              }
          }
      }

in  animateDead
