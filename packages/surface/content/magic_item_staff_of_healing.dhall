-- Staff of Healing — SRD 5.2.1 magic item (rare, attunement).
--
-- RAW (Magic Items):
--   "This staff has 10 charges. While holding the staff, you can cast
--    one of the spells on the following table from it, using your
--    spellcasting ability modifier. The table indicates how many charges
--    you must expend to cast the spell."
--   "Cure Wounds: 1 charge per spell level (maximum 4 for a level 4
--    spell)."
--   "Lesser Restoration: 2."
--   "Mass Cure Wounds: 5."
--   "Regaining Charges. The staff regains 1d6 + 4 expended charges
--    daily at dawn. If you expend the last charge, roll 1d20. On a 1,
--    the staff vanishes in a flash of light, lost forever."
--
-- Honest fit to the existing charge-cast magic-item surface for the
-- cast/recharge/destruction mechanics:
--   • ActivationResource.charge_pool (10 charges)
--   • RestResetCadence.dawn with regain = 1d6 + 4
--   • multiple grant_spell_access effects using charge_cast
--   • ItemDestructionPolicy.last_charge_roll (d20, destroyOn=1)
--
-- Known omission: the attunement restriction "by a Bard, Cleric, or
-- Druid" is not representable on MagicItemRecord, which only carries a
-- boolean requiresAttunement flag. That gap is recorded in
-- proposal-magic_item_staff_of_healing.md and the result is classified
-- as surface_widening rather than clean.

let staffOfHealing =
      { kind = "magic_item"
      , id = "magic_item_staff_of_healing"
      , name = "Staff of Healing"
      , rarity = "rare"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#StaffOfHealing"
          }
      , description =
          "This staff has 10 charges. While holding the staff, you can cast one of the spells on the following table from it, using your spellcasting ability modifier. The table indicates how many charges you must expend to cast the spell: Cure Wounds (1 charge per spell level, maximum 4 for a level 4 spell), Lesser Restoration (2 charges), Mass Cure Wounds (5 charges). The staff regains 1d6 + 4 expended charges daily at dawn. If you expend the last charge, roll 1d20. On a 1, the staff vanishes in a flash of light, lost forever."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "standard_action", action = "magic" }
          , resource =
              { kind = "charge_pool"
              , cap = { kind = "fixed", uses = 10 }
              }
          , resetCadence =
              { kind = "dawn"
              , regain =
                  Some
                    { kind = "fixed"
                    , expr = { dice = 1, dieSize = 6, flat = 4 }
                    }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "grant_spell_access"
                      , spellId = "cure_wounds"
                      , mode =
                          { kind = "charge_cast"
                          , baseCharges = 1
                          , perLevelCharges = 1
                          , minLevel = 1
                          , maxLevel = 4
                          }
                      }
                    , { kind = "grant_spell_access"
                      , spellId = "lesser_restoration"
                      , mode =
                          { kind = "charge_cast"
                          , baseCharges = 2
                          , perLevelCharges = 0
                          , minLevel = 2
                          , maxLevel = 2
                          }
                      }
                    , { kind = "grant_spell_access"
                      , spellId = "mass_cure_wounds"
                      , mode =
                          { kind = "charge_cast"
                          , baseCharges = 5
                          , perLevelCharges = 0
                          , minLevel = 5
                          , maxLevel = 5
                          }
                      }
                    ]
                }
              ]
          }
      , destruction =
          { kind = "last_charge_roll", die = 20, destroyOn = 1 }
      }

in  staffOfHealing
