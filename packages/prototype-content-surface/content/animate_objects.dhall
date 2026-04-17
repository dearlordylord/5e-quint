-- Animate Objects — SRD 5.2.1 Spell, Level 5, Transmutation.
-- §C4c validation ref — templated_multi_spawn family.
--
-- Capacity = caster's spellcasting ability modifier. Size tiers:
--   Medium or smaller: weight 1, HP 10, Slam 1d4 + 3
--   Large:             weight 2, HP 20, Slam 2d6 + 3 + casting mod
--   Huge:              weight 3, HP 40, Slam 2d12 + 3 + casting mod
-- Slam scales +1d4/1d6/1d12 per slot above 5 per size.
--
-- The shared base stat block (AC, speeds, abilities, immunities,
-- senses) sits on `baseStatBlock`; per-size HP and Slam damage live
-- on `sizeTiers`. The Slam attack bonus on the base stat block is
-- the caster's spell_attack_mod, uniform across sizes.

let animateObjects =
      { kind = "spell"
      , id = "animate_objects"
      , name = "Animate Objects"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Animate Objects"
          }
      , description =
          "Objects animate at your command. Choose up to spellcasting-mod nonmagical objects within range; Medium or smaller = 1, Large = 2, Huge = 3 toward the cap. Each becomes a Construct using the Animated Object stat block. Reverts to object form at 0 HP (overflow damage carries over)."
      , mechanics =
          { family = "templated_multi_spawn"
          , level = 5
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , capacity =
              { kind = "caster_ability_modifier"
              , ability = "cha"
              }
          , baseStatBlock =
              { displayName = "Animated Object"
              , size = "medium"
              , creatureType = "construct"
              , ac = { kind = "literal", value = 15 }
              , hp = { kind = "literal", value = 10 }
              , speeds =
                  [ { kind = "walk"
                    , feet = { kind = "literal", value = 30 }
                    , requiresSlotLevel = None Natural
                    }
                  ]
              , abilityScores =
                  { str = 16, dex = 10, con = 10, int = 3, wis = 3, cha = 1 }
              , immunities =
                  { damageTypes = [ "poison", "psychic" ]
                  , conditions =
                      [ "charmed", "exhaustion", "frightened", "paralyzed", "poisoned" ]
                  }
              , senses =
                  [ { kind = "blindsight", rangeFeet = 30 } ]
              , languages = "caster_languages"
              , actions =
                  { attacks =
                      [ { name = "Slam"
                        , attackType = "melee"
                        , attackBonus =
                            { kind = "caster_derived"
                            , source = "spell_attack_mod"
                            }
                        , reachFeet = 5
                        , onHit =
                            [ { kind = "damage"
                              , damageType = "force"
                              , amount =
                                  { kind = "fixed"
                                  , expr = { dice = 1, dieSize = 4, flat = 3 }
                                  }
                              }
                            ]
                        }
                      ]
                  }
              }
          , sizeTiers =
              -- Dhall homogeneous list: spellcastingMod is Optional,
              -- medium omits it (None), Large/Huge have Some True.
              [ { size = "medium"
                , weight = 1
                , hp = { kind = "literal", value = 10 }
                , slamDamage =
                    { kind = "linear_per_level"
                    , axis = "slot"
                    , base =
                        { dice = 1
                        , dieSize = 4
                        , flat = 3
                        , spellcastingMod = None Bool
                        }
                    , perLevel = { dice = 1 }
                    , startingAtLevel = 5
                    }
                }
              , { size = "large"
                , weight = 2
                , hp = { kind = "literal", value = 20 }
                , slamDamage =
                    { kind = "linear_per_level"
                    , axis = "slot"
                    , base =
                        { dice = 2
                        , dieSize = 6
                        , flat = 3
                        , spellcastingMod = Some True
                        }
                    , perLevel = { dice = 1 }
                    , startingAtLevel = 5
                    }
                }
              , { size = "huge"
                , weight = 3
                , hp = { kind = "literal", value = 40 }
                , slamDamage =
                    { kind = "linear_per_level"
                    , axis = "slot"
                    , base =
                        { dice = 2
                        , dieSize = 12
                        , flat = 3
                        , spellcastingMod = Some True
                        }
                    , perLevel = { dice = 1 }
                    , startingAtLevel = 5
                    }
                }
              ]
          , control =
              { initiative = "shared_with_caster"
              , turnOrder = "immediately_after_caster"
              , commandCost = { kind = "bonus_action" }
              , commandRangeFeet = 500
              , defaultBehavior = "dodge_and_avoid"
              }
          , revertOnZeroHp = True
          }
      }

in  animateObjects
