-- Fast Hands — SRD 5.2.1 Rogue Thief level 3.
--
-- RAW (Classes / Rogue / Level 3: Fast Hands):
--   As a Bonus Action, make a Dexterity (Sleight of Hand) check to pick a
--   lock or disarm a trap with Thieves' Tools, pick a pocket, take the
--   Utilize action, or take the Magic action to use a magic item that
--   requires that action.
--
-- This Unit records the Bonus Action permission. Lock/trap/pocket checks,
-- Utilize effects, and magic-item activation procedures remain outside this
-- authored mechanics shape.

let fastHands =
      { acquiredAtLevel = 3
      , className = "rogue"
      , description =
          "As a Bonus Action, you can make a Dexterity (Sleight of Hand) check to pick a lock or disarm a trap with Thieves' Tools or to pick a pocket, take the Utilize action, or take the Magic action to use a magic item that requires that action."
      , id = "rogue_fast_hands"
      , kind = "class_feature"
      , mechanics =
        { family = "bonus_action_delegated_standard_actions"
        , activationCost.kind = "bonus_action"
        , sleightOfHand =
          { abilityCheck = { ability = "dex", skill = "sleight_of_hand" }
          , operations =
            [ "pick_lock_with_thieves_tools"
            , "disarm_trap_with_thieves_tools"
            , "pick_pocket"
            ]
          }
        , objectUse =
          { actions =
            [ { action = "utilize" }
            , { action = "magic"
              , restrictedTo = "magic_item_requires_magic_action"
              }
            ]
          }
        }
      , name = "Fast Hands"
      , provenance = { kind = "srd-5.2.1", section = "Classes/Rogue.md:159-166" }
      }

in  fastHands
