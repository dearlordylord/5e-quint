-- Protection from Evil and Good — SRD 5.2.1 Spell, level 1, Abjuration.
--
-- RAW (Spells / Descriptions M-P / Protection from Evil and Good):
--   "Until the spell ends, one willing creature you touch is protected
--    against creatures that are Aberrations, Celestials, Elementals,
--    Fey, Fiends, or Undead. The protection grants several benefits.
--    Creatures of those types have Disadvantage on attack rolls
--    against the target. The target also can't be possessed by or
--    gain the Charmed or Frightened conditions from them. If the
--    target is already possessed, Charmed, or Frightened by such a
--    creature, the target has Advantage on any new saving throw
--    against the relevant effect."
--
-- Consolidated validation reference for:
--   • EffectAtom.modify_roll_advantage.attackerTypeFilter (attacker-
--     side creature-type narrowing; complements the target-side
--     filter on TargetSelection used by Hold Person. Both share the
--     SRD 5.2.1 CreatureType enum.)
--   • Components.materialCostGp = 25 + materialConsumed = True (the
--     25-GP Holy Water "which the spell consumes" material-cost
--     metadata. No behavioral wiring; present on the spell card.)
--   • family = activation with a single direct phase under
--     concentration duration (same pattern as Fly's grant_speed — the
--     effect persists for the concentration window).
--
-- DEFERRED. The "can't be Charmed/Frightened by them" immunity and
-- "Advantage on saves against already-applied charm/fright by them"
-- conditional re-roll are further benefits of the spell. Modeling
-- conditional condition-immunity scoped by attacker creature-type and
-- conditional save-advantage on ongoing effects requires more atoms
-- than fit one unit; left for a future tick as a focused widening.
-- The attack-roll disadvantage is the most RAW-visible effect and is
-- sufficient to exercise attackerTypeFilter as the validation goal.

let protectionFromEvilAndGood =
      { kind = "spell"
      , id = "protection_from_evil_and_good"
      , name = "Protection from Evil and Good"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Protection from Evil and Good"
          }
      , description =
          "Until the spell ends, one willing creature you touch is protected against creatures that are Aberrations, Celestials, Elementals, Fey, Fiends, or Undead. Creatures of those types have Disadvantage on attack rolls against the target. The target also can't be possessed by or gain the Charmed or Frightened conditions from them. If the target is already possessed, Charmed, or Frightened by such a creature, the target has Advantage on any new saving throw against the relevant effect."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "a flask of Holy Water"
              , materialCostGp = 25
              , materialConsumed = True
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "protection_from_evil_and_good_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , effects =
                    [ { kind = "modify_roll_advantage"
                      , mode = "disadvantage"
                      , on = [ "attack_roll" ]
                      , attackerTypeFilter =
                          [ "aberration"
                          , "celestial"
                          , "elemental"
                          , "fey"
                          , "fiend"
                          , "undead"
                          ]
                      }
                    ]
                }
              ]
          }
      }

in  protectionFromEvilAndGood
