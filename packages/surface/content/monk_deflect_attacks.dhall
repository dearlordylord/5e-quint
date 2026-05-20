-- Deflect Attacks — SRD 5.2.1 Monk level 3.
--
-- RAW (Classes / Monk / Level 3: Deflect Attacks):
--   When an attack roll hits you and its damage includes Bludgeoning,
--   Piercing, or Slashing damage, you can take a Reaction to reduce the
--   attack's total damage by 1d10 + Dexterity modifier + Monk level.
--   If the damage is reduced to 0, expend 1 Focus Point to redirect part of
--   that damage. Melee redirects choose a visible creature within 5 feet;
--   ranged redirects choose a visible creature within 60 feet that isn't
--   behind Total Cover. The target makes a Dexterity saving throw against the
--   Monk Focus save DC and, on failure, takes two Martial Arts dice plus
--   Dexterity modifier damage of the same type dealt by the attack.

let deflectAttacks =
      { id = "monk_deflect_attacks"
      , kind = "class_feature"
      , name = "Deflect Attacks"
      , className = "monk"
      , acquiredAtLevel = 3
      , description =
          "When an attack roll hits you and its damage includes Bludgeoning, Piercing, or Slashing damage, take a Reaction to reduce the attack's total damage against you."
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Monk#Deflect Attacks" }
      , mechanics =
          { family = "reaction_roll_or_damage_reduction"
          , modifiers =
              [ { kind = "attack_damage_reduction"
                , trigger =
                    { kind = "hit_by_attack_roll"
                    , damageIncludes = [ "bludgeoning", "piercing", "slashing" ]
                    }
                , reduction =
                    { kind = "dice_plus_ability_modifier_plus_class_level"
                    , dice = { dice = 1, dieSize = 10 }
                    , ability = "dex"
                    }
                , zeroDamageRedirect =
                    { spends =
                        { resourceUnitId = "monk_monks_focus", amount = 1 }
                    , save =
                        { ability = "dex"
                        , dc =
                            { kind = "ability_plus_proficiency"
                            , base = 8
                            , ability = "wis"
                            }
                        }
                    , damage =
                        { dice =
                            { dice = 2
                            , dieSize = { kind = "martial_arts_die" }
                            }
                        , ability = "dex"
                        , damageType = { kind = "same_type_dealt_by_attack" }
                        }
                    , targetGate =
                        { melee = { kind = "visible_within_5_feet" }
                        , ranged =
                            { kind =
                                "visible_within_60_feet_without_total_cover"
                            }
                        }
                    }
                }
              ]
          }
      }

in  deflectAttacks
