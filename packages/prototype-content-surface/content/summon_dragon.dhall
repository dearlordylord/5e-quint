-- Summon Dragon — SRD 5.2.1 Spell, Level 5, Conjuration.
-- Family: spawned_creature (§C4a validation ref — full complexity:
-- level-parameterized stat block + multiattack dispatch + breath-
-- weapon save_gate + caster-shared-resistance trait + cast-time
-- damage-type choice).
--
-- The Draconic Spirit ships inline; AC, HP, Rend flat damage all
-- scale with the spell level. Multiattack dispatches (slot/2 floor)
-- Rends + one Breath Weapon per use.
--
-- PARTIAL — multiattack count approximation:
--   RAW says "half the spell's level (round down)". The
--   per_spell_level StatBlockValue shape is linear (base + perLevel
--   × (slot − startingAtLevel)) and cannot express floor(slot/2)
--   exactly across slots 5..9. Encoded as base=2, perLevel=1,
--   startingAtLevel=5 which matches at slots 5, 6, 8 but over-counts
--   by 1 at slot 7 and slot 9. DEFERRED — pressure case for a
--   StatBlockValue `half_spell_level_floor` variant (appears again
--   in every XPHB summon that scales a dispatch count by half slot).
--
-- PARTIAL — Breath Weapon slot scaling:
--   RAW "2d6 damage" does not state explicit slot scaling but the
--   header's "Use the spell slot's level for the spell's level in
--   the stat block" is ambiguous on whether the flat 2d6 scales.
--   Encoded as fixed 2d6; if a later scaling clarification lands,
--   widen to slot-scaled DiceAmount.
--
-- Shared Resistances trait + Breath Weapon damage type share the
-- cast-time damage-type choice; the trait is encoded via
-- CreatureTraitEffect.caster_shared_resistance, and the Breath
-- Weapon damage uses DamageTypeRef.choice with the same option set.

let summonDragon =
      { kind = "spell"
      , id = "summon_dragon"
      , name = "Summon Dragon"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Summon Dragon"
          }
      , description =
          "You call forth a Dragon spirit. It manifests in an unoccupied space that you can see within range and uses the Draconic Spirit stat block. The creature disappears when it drops to 0 Hit Points or when the spell ends. The creature is an ally to you and your allies. In combat, it shares your Initiative count but takes its turn immediately after yours; obeys your verbal commands (no action required)."
      , mechanics =
          { family = "spawned_creature"
          , level = 5
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components =
              { v = True, s = True, m = Some "an object with the image of a dragon engraved on it worth 500+ GP" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "hour", amount = 1 }
              }
          , statBlock =
              { displayName = "Draconic Spirit"
              , size = "large"
              , creatureType = "dragon"
              , ac =
                  { kind = "linear_per_level", axis = "slot"
                  , base = 14
                  , perLevel = 1
                  , startingAtLevel = 5
                  }
              , hp =
                  { kind = "linear_per_level", axis = "slot"
                  , base = 50
                  , perLevel = 10
                  , startingAtLevel = 5
                  }
              , speeds =
                  [ { kind = "walk"
                    , feet = { kind = "literal", value = 30 }
                    , requiresSlotLevel = None Natural
                    }
                  , { kind = "fly"
                    , feet = { kind = "literal", value = 60 }
                    , requiresSlotLevel = None Natural
                    }
                  , { kind = "swim"
                    , feet = { kind = "literal", value = 30 }
                    , requiresSlotLevel = None Natural
                    }
                  ]
              , abilityScores =
                  { str = 19, dex = 14, con = 17, int = 10, wis = 14, cha = 14 }
              , saveProficiencies = [ "str", "dex", "con", "int", "wis", "cha" ]
              , resistances =
                  { kind = "choose_one_from"
                  , options =
                      [ "acid", "cold", "fire", "lightning", "poison" ]
                  }
              , immunities =
                  { conditions = [ "charmed", "frightened", "poisoned" ] }
              , senses =
                  [ { kind = "blindsight", rangeFeet = 30 }
                  , { kind = "darkvision", rangeFeet = 60 }
                  ]
              , languages = "caster_languages"
              , actions =
                  { multiattacks =
                      [ { name = "Multiattack"
                        , dispatches =
                            [ { name = "Rend"
                              , count =
                                  { kind = "linear_per_level", axis = "slot"
                                  , base = 2
                                  , perLevel = 1
                                  , startingAtLevel = 5
                                  }
                              }
                            , { name = "Breath Weapon"
                              -- Encoded as per_spell_level with perLevel=0 rather
                              -- than `literal` because Dhall requires a homogeneous
                              -- list type across both dispatch entries
                              -- (StatBlockValue variants are tagged unions without
                              -- a union-type synthesis). Semantically equivalent
                              -- to literal=1.
                              , count =
                                  { kind = "linear_per_level", axis = "slot"
                                  , base = 1
                                  , perLevel = 0
                                  , startingAtLevel = 5
                                  }
                              }
                            ]
                        }
                      ]
                  , attacks =
                      [ { name = "Rend"
                        , attackType = "melee"
                        , attackBonus =
                            { kind = "caster_derived"
                            , source = "spell_attack_mod"
                            }
                        , reachFeet = 10
                        , onHit =
                            [ { kind = "damage"
                              , damageType = "piercing"
                              , amount =
                                  { kind = "linear_per_level"
                                  , axis = "slot"
                                  , base = { dice = 1, dieSize = 6, flat = 4 }
                                  , perLevel = { flat = 1 }
                                  , startingAtLevel = 5
                                  }
                              }
                            ]
                        }
                      ]
                  , saves =
                      [ { name = "Breath Weapon"
                        , ability = "dex"
                        , dc = { kind = "caster_spell_save_dc" }
                        , area = { kind = "cone", lengthFeet = 30 }
                        , onFail =
                            { kind = "damage"
                            , damageType =
                                { kind = "hole"
                                , holeId = "summon_dragon_damage_type"
                                , label = "breath-weapon damage type (shared with Shared Resistances)"
                                , value =
                                    { kind = "choice"
                                    , label = "breath-weapon damage type (shared with Shared Resistances)"
                                    , options =
                                        [ "acid", "cold", "fire", "lightning", "poison" ]
                                    }
                                }
                            , amount =
                                { kind = "fixed"
                                , expr = { dice = 2, dieSize = 6 }
                                }
                            }
                        , onSuccess = { kind = "half_damage" }
                        }
                      ]
                  }
              , traits =
                  [ { name = "Shared Resistances"
                    , description =
                        "When you summon the spirit, choose one of its Resistances. You have Resistance to the chosen damage type until the spell ends."
                    , effect =
                        { kind = "caster_shared_resistance"
                        , chosenFrom = "resistances_list"
                        }
                    }
                  ]
              }
          , control =
              { initiative = "shared_with_caster"
              , turnOrder = "immediately_after_caster"
              , commandCost = { kind = "no_action_required" }
              , commandRangeFeet = 60
              , defaultBehavior = "dodge_and_avoid"
              }
          , dismissal =
              { onZeroHp = "disappears"
              , onSpellEnd = "disappears"
              }
          }
      }

in  summonDragon
