-- Find Steed — SRD 5.2.1 Spell, Level 2, Conjuration.
-- Family: spawned_creature (§C4a validation ref — fully inline,
-- level-parameterized, type-mode, with a caster-heal-link trait).
--
-- The Otherworldly Steed stat block ships inline with the spell; AC,
-- HP, and Slam damage all scale with the spell's level. Creature type
-- is a cast-time choice (Celestial/Fey/Fiend) that also selects the
-- Slam damage type (Radiant/Psychic/Necrotic respectively).
--
-- PARTIAL — type-branched damage not encoded on Otherworldly Slam.
-- The Slam's damage type is "Radiant (Celestial), Psychic (Fey), or
-- Necrotic (Fiend)"; this couples the mode picker to the action's
-- damage type, which the current CreatureStatBlockOverrides shape
-- does not express (overrides can replace the whole actions list,
-- but we would need all three copies to represent the coupling).
-- Authored here as Radiant as a placeholder; the mode branch tracks
-- the creature-type swap but not the damage-type swap. Fell
-- Glare/Fey Step/Healing Touch bonus actions (Recharge after Long
-- Rest, mode-gated) are DEFERRED — the recharge mechanic and the
-- mode-gated bonus-action grammar aren't yet modeled.

let findSteed =
      { kind = "spell"
      , id = "find_steed"
      , name = "Find Steed"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Find Steed"
          }
      , description =
          "You summon an otherworldly being that appears as a loyal steed in an unoccupied space of your choice within range. This creature uses the Otherworldly Steed stat block. Whenever you cast the spell, choose the steed's creature type — Celestial, Fey, or Fiend — which determines certain traits in the stat block."
      , mechanics =
          { family = "spawned_creature"
          , level = 2
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , statBlock =
              { displayName = "Otherworldly Steed"
              , size = "large"
              , creatureType =
                  { kind = "choice"
                  , label = "creature type"
                  , options = [ "celestial", "fey", "fiend" ]
                  }
              , ac =
                  { kind = "linear_per_level", axis = "slot"
                  , base = 10
                  , perLevel = 1
                  , startingAtLevel = 2
                  }
              , hp =
                  { kind = "linear_per_level", axis = "slot"
                  , base = 5
                  , perLevel = 10
                  , startingAtLevel = 2
                  }
              , speeds =
                  [ { kind = "walk"
                    , feet = { kind = "literal", value = 60 }
                    , requiresSlotLevel = None Natural
                    }
                  , { kind = "fly"
                    , feet = { kind = "literal", value = 60 }
                    , requiresSlotLevel = Some 4
                    }
                  ]
              , abilityScores =
                  { str = 18, dex = 12, con = 14, int = 6, wis = 12, cha = 8 }
              , saveProficiencies = [ "str", "dex", "con", "wis" ]
              , languages = "caster_languages"
              , actions =
                  { attacks =
                      [ { name = "Otherworldly Slam"
                        , attackType = "melee"
                        , attackBonus =
                            { kind = "caster_derived"
                            , source = "spell_attack_mod"
                            }
                        , reachFeet = 5
                        , onHit =
                            [ { kind = "damage"
                              , damageType = "radiant"
                              , amount =
                                  { kind = "fixed"
                                  , expr =
                                      { dice = 1
                                      , dieSize = 8
                                      }
                                  }
                              }
                            ]
                        }
                      ]
                  }
              , traits =
                  [ { name = "Life Bond"
                    , description =
                        "When you regain Hit Points from a level 1+ spell, the steed regains the same number of Hit Points if you're within 5 feet of it."
                    , effect =
                        { kind = "caster_heal_link"
                        , rangeFeet = 5
                        }
                    }
                  ]
              }
          , mode =
              { label = "creature type"
              , options =
                  [ { id = "celestial"
                    , displayName = "Celestial"
                    , overrides = { creatureType = "celestial" }
                    }
                  , { id = "fey"
                    , displayName = "Fey"
                    , overrides = { creatureType = "fey" }
                    }
                  , { id = "fiend"
                    , displayName = "Fiend"
                    , overrides = { creatureType = "fiend" }
                    }
                  ]
              }
          , control =
              { initiative = "shared_with_caster"
              , turnOrder = "immediately_after_caster"
              , commandCost = { kind = "no_action_required" }
              , commandRangeFeet = 60
              , defaultBehavior = "independent"
              }
          , dismissal =
              { onZeroHp = "disappears"
              , onSpellEnd = "disappears"
              , caster0Hp = "disappears"
              , leavesBehind = "equipment"
              }
          }
      }

in  findSteed
