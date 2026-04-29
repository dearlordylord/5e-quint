-- Cure Wounds — SRD 5.2.1 Spell, level 1, Abjuration.
--
-- RAW (Spells / Descriptions A-D / Cure Wounds):
--   "A creature you touch regains a number of Hit Points equal to 2d8
--    plus your spellcasting ability modifier."
--   "Using a Higher-Level Spell Slot. The healing increases by 2d8 for
--    each spell slot level above 1."
--
-- Consolidated validation reference for:
--   • DiceExpr.spellcastingMod = True (new widening — caster's
--     spellcasting ability modifier added to the dice total; concrete
--     ability is resolved by the engine against the caster's class,
--     not fixed by the spell. Healing Word, Guiding Bolt, and several
--     cleric spells share this shape.)
--   • EffectAtom.heal_hp with linear_per_level scaling on axis=slot.
--   • ActivationPhase.direct (touch, single target, no gate).
--   • explicit initial hole for target selection.

let cureWounds =
      { kind = "spell"
      , id = "cure_wounds"
      , name = "Cure Wounds"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Cure Wounds"
          }
      , description =
          "A creature you touch regains a number of Hit Points equal to 2d8 plus your spellcasting ability modifier. Using a Higher-Level Spell Slot. The healing increases by 2d8 for each spell slot level above 1."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "cure_wounds_target"
                    , label = Some "healing target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , effects =
                    [ { kind = "heal_hp"
                      , amount =
                          { kind = "linear_per_level"
                          , axis = "slot"
                          , base =
                              { dice = 2
                              , dieSize = 8
                              , spellcastingMod = True
                              }
                          , perLevel = { dice = 2 }
                          , startingAtLevel = 1
                          }
                      , target = "target_creature"
                      }
                    ]
                }
              ]
          }
      }

in  cureWounds
