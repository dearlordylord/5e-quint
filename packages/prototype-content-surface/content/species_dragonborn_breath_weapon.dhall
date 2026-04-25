-- Breath Weapon (Dragonborn) — SRD 5.2.1 species trait.
--
-- RAW (Character-Origins / Dragonborn):
--   "When you take the Attack action on your turn, you can replace one
--    of your attacks with an exhalation of magical energy in either a
--    15-foot Cone or a 30-foot Line that is 5 feet wide (choose the
--    shape each time). Each creature in that area must make a
--    Dexterity saving throw (DC 8 plus your Constitution modifier and
--    Proficiency Bonus). On a failed save, a creature takes 1d10
--    damage of the type determined by your Draconic Ancestry trait. On
--    a successful save, a creature takes half as much damage. This
--    damage increases by 1d10 when you reach character levels 5
--    (2d10), 11 (3d10), and 17 (4d10)."
--   "You can use this Breath Weapon a number of times equal to your
--    Proficiency Bonus, and you regain all expended uses when you
--    finish a Long Rest."
--
-- This file is the consolidated validation reference for the
-- phases-widening arc:
--   • ActivatedAbilityMechanics.phases (replaces effect: EffectAtom)
--   • activationCost = replace_attack
--   • ActivationPhase.save_gate with onSuccess = half_damage
--   • Attachment.area.shape = AreaShapeSpec.choice
--   • AreaOrigin.self (cone/line emanate from caster)
--   • DcSource.innate_dc (base 8 + CON mod + PB)
--   • DamageTypeRef.choice (picked from draconic ancestry)
--   • UseCountCap.proficiency_bonus
--   • DiceAmount.threshold_tiers on character axis for +1d10 ramp

let breathWeapon =
      { kind = "species_trait"
      , id = "species_dragonborn_breath_weapon"
      , name = "Breath Weapon"
      , species = "dragonborn"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Character-Origins/Dragonborn#Breath Weapon"
          }
      , description =
          "When you take the Attack action on your turn, you can replace one of your attacks with an exhalation of magical energy in either a 15-foot Cone or a 30-foot Line that is 5 feet wide (choose the shape each time). Each creature in that area must make a Dexterity saving throw (DC 8 plus your Constitution modifier and Proficiency Bonus). On a failed save, a creature takes 1d10 damage of the type determined by your Draconic Ancestry trait. On a successful save, a creature takes half as much damage. This damage increases by 1d10 when you reach character levels 5 (2d10), 11 (3d10), and 17 (4d10). You can use this Breath Weapon a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "replace_attack" }
          , resource =
              { kind = "use_count"
              , cap = { kind = "proficiency_bonus" }
              }
          , resetCadence = { kind = "long_rest" }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "area"
                    , origin = { kind = "self" }
                    , shape =
                        { kind = "choice"
                        , options =
                            [ { kind = "cone"
                              , lengthFeet = 15
                              , widthFeet = None Natural
                              }
                            , { kind = "line"
                              , lengthFeet = 30
                              , widthFeet = Some 5
                              }
                            ]
                        }
                    }
                , ability = "dex"
                , dc =
                    { kind = "innate_dc"
                    , base = 8
                    , ability = "con"
                    }
                , onFail =
                    { kind = "damage"
                    , damageType =
                        { kind = "hole"
                        , holeId = "species_dragonborn_breath_weapon_damage_type"
                        , label = "draconic ancestry"
                        , value =
                            { kind = "choice"
                            , label = "draconic ancestry"
                            , options =
                                [ "acid"
                                , "cold"
                                , "fire"
                                , "lightning"
                                , "poison"
                                ]
                            }
                        }
                    , amount =
                        { kind = "threshold_tiers"
                        , axis = "character"
                        , base = { dice = 1, dieSize = 10 }
                        , tiers =
                            [ { atLevel = 5, override.dice = 2 }
                            , { atLevel = 11, override.dice = 3 }
                            , { atLevel = 17, override.dice = 4 }
                            ]
                        }
                    }
                , onSuccess = { kind = "half_damage" }
                }
              ]
          }
      }

in  breathWeapon
