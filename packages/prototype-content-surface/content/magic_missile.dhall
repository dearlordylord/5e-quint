-- Magic Missile — SRD 5.2.1 Spell, level 1, Evocation.
--
-- RAW (Spells / Descriptions M-P / Magic Missile):
--   "You create three glowing darts of magical force. Each dart
--    strikes a creature of your choice that you can see within range.
--    A dart deals 1d4 + 1 Force damage to its target. The darts all
--    strike simultaneously, and you can direct them to hit one
--    creature or several."
--   "Using a Higher-Level Spell Slot. The spell creates one more dart
--    for each spell slot level above 1."
--
-- Consolidated validation reference for:
--   • TargetSelection.choose_up_to.repeatsAllowed = True (new
--     widening — the multiset selection flag that lets the same
--     creature absorb more than one dart. Contrasts with Chain
--     Lightning's default-false "a target can be targeted by only
--     one of the bolts". Magic Missile is the canonical multiset case.)
--   • ActivationPhase.direct (auto-hit, no save, no attack roll)
--   • DiceExpr with flat = 1 (the "+1" per-dart bonus)
--
-- MODELING NOTE. Each dart's 1d4+1 damage is encoded once as the
-- phase's effect; the slot-scaled count is the number of
-- independent applications (one per selected target in the multiset).
-- The engine is expected to roll damage per dart (not share a single
-- roll across all of them), matching RAW's "A dart deals 1d4 + 1".

let magicMissile =
      { kind = "spell"
      , id = "magic_missile"
      , name = "Magic Missile"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Magic Missile"
          }
      , description =
          "You create three glowing darts of magical force. Each dart strikes a creature of your choice that you can see within range. A dart deals 1d4 + 1 Force damage to its target. The darts all strike simultaneously, and you can direct them to hit one creature or several. Using a Higher-Level Spell Slot. The spell creates one more dart for each spell slot level above 1."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "target"
                    , selection =
                        { mode = "choose_up_to"
                        , count =
                            { kind = "linear"
                            , base = 3
                            , perSlotAboveBase = 1
                            , baseLevel = 1
                            }
                        , repeatsAllowed = True
                        }
                    }
                , effects =
                    [ { kind = "damage"
                      , damageType = "force"
                      , amount =
                          { kind = "fixed"
                          , expr = { dice = 1, dieSize = 4, flat = 1 }
                          }
                      }
                    ]
                }
              ]
          }
      }

in  magicMissile
