-- True Strike — SRD 5.2.1 Cantrip, Divination.
--
-- RAW (Spells/Descriptions-S-Z#True Strike):
--   "You make one attack with the weapon used in the spell's casting."
--   "The attack uses your spellcasting ability for the attack and
--    damage rolls instead of using Strength or Dexterity."
--   "If the attack deals damage, it can be Radiant damage or the
--    weapon's normal damage type (your choice)."
--   "Cantrip Upgrade. Whether you deal Radiant damage or the weapon's
--    normal damage type, the attack deals extra Radiant damage when you
--    reach levels 5 (1d6), 11 (2d6), and 17 (3d6)."

let trueStrike =
      { kind = "spell"
      , id = "true_strike"
      , name = "True Strike"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#True Strike"
          }
      , description =
          "Guided by a flash of magical insight, you make one attack with the weapon used in the spell's casting. The attack uses your spellcasting ability for the attack and damage rolls instead of using Strength or Dexterity. If the attack deals damage, it can be Radiant damage or the weapon's normal damage type, your choice. Cantrip Upgrade: the attack deals extra Radiant damage when you reach levels 5, 11, and 17."
      , mechanics =
          { family = "activation"
          , level = 0
          , school = "divination"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components =
              { v = False
              , s = True
              , m =
                  Some
                    "a weapon with which you have proficiency and that is worth 1+ CP"
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "make_weapon_attack"
                      , weapon = "material_component"
                      , abilityOverride = "spellcasting"
                      , damageTypeChoice = [ "radiant", "weapon_normal" ]
                      , bonusDamage =
                          { damageType = "radiant"
                          , amount =
                              { kind = "threshold_tiers"
                              , axis = "character"
                              , base = { dice = 0, dieSize = 6 }
                              , tiers =
                                  [ { atLevel = 5, override = { dice = 1 } }
                                  , { atLevel = 11, override = { dice = 2 } }
                                  , { atLevel = 17, override = { dice = 3 } }
                                  ]
                              }
                          }
                      }
                    ]
                }
              ]
          }
      }

in  trueStrike
