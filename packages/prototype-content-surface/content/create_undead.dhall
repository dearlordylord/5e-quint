-- Create Undead — SRD 5.2.1 Spell, Level 6, Necromancy.
-- §C4b validation ref — reanimated_creature family with night-only
-- gate + per-slot menu (L6: 3 Ghouls; L7: 4 Ghouls; L8: 5 Ghouls or
-- 2 Ghasts/Wights; L9: 6 Ghouls, 3 Ghasts/Wights, or 2 Mummies).

let createUndead =
      { kind = "spell"
      , id = "create_undead"
      , name = "Create Undead"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Create Undead"
          }
      , description =
          "Cast only at night. Choose up to three corpses of Medium or Small Humanoids within range. Each one becomes a Ghoul under your control. As a Bonus Action within 120 ft, command any animated creature. Control lasts 24 hours; recast within that window to reassert control over up to three creatures. Higher-level slots open a per-slot menu of Ghoul / Ghast / Wight / Mummy counts."
      , mechanics =
          { family = "reanimated_creature"
          , level = 6
          , school = "necromancy"
          , castingTime = { kind = "minutes", amount = 1, ritual = False }
          , range = { kind = "point", feet = 10 }
          , components =
              { v = True
              , s = True
              , m = Some "one 150+ GP black onyx stone for each corpse"
              , materialCostGp = Some 150
              }
          , duration = { kind = "instantaneous" }
          , targetKind = "corpse_of_small_or_medium_humanoid"
          , nightOnly = True
          , menu =
              [ { slotLevel = 6
                , options = [ { monsterId = "ghoul", count = 3 } ]
                }
              , { slotLevel = 7
                , options = [ { monsterId = "ghoul", count = 4 } ]
                }
              , { slotLevel = 8
                , options =
                    [ { monsterId = "ghoul", count = 5 }
                    , { monsterId = "ghast", count = 2 }
                    , { monsterId = "wight", count = 2 }
                    ]
                }
              , { slotLevel = 9
                , options =
                    [ { monsterId = "ghoul", count = 6 }
                    , { monsterId = "ghast", count = 3 }
                    , { monsterId = "wight", count = 3 }
                    , { monsterId = "mummy", count = 2 }
                    ]
                }
              ]
          , control =
              { initiative = "own_roll"
              , commandCost = { kind = "bonus_action" }
              , commandRangeFeet = 120
              , defaultBehavior = "dodge_and_avoid"
              }
          , reassertWindow =
              { hours = 24
              , maxReassertPerCast = 3
              }
          }
      }

in  createUndead
