-- Wand of Fireballs — SRD 5.2.1 magic item (rare, attunement by a spellcaster).
--
-- RAW (Magic Items):
--   "This wand has 7 charges. While holding it, you can expend no more
--    than 3 charges to cast Fireball (save DC 15) from it. For 1
--    charge, you cast the level 3 version of the spell. You can
--    increase the spell's level by 1 for each additional charge you
--    expend."
--   "Regaining Charges. The wand regains 1d6 + 1 expended charges
--    daily at dawn. If you expend the wand's last charge, roll 1d20.
--    On a 1, the wand crumbles into ashes and is destroyed."
--
-- Clean fit to the existing magic-item activation surface:
--   • ActivationResource.charge_pool (7 charges)
--   • grant_spell_access.mode.charge_cast (1-3 charges maps to L3-L5)
--   • grant_spell_access.dcOverride (fixed DC 15)
--   • RestResetCadence.dawn with regain = 1d6 + 1
--   • ItemDestructionPolicy.last_charge_roll (d20, destroyOn=1)

let wand =
      { kind = "magic_item"
      , id = "magic_item_wand_of_fireballs"
      , name = "Wand of Fireballs"
      , rarity = "rare"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#WandOfFireballs"
          }
      , description =
          "This wand has 7 charges. While holding it, you can expend no more than 3 charges to cast Fireball (save DC 15) from it. For 1 charge, you cast the level 3 version of the spell. You can increase the spell's level by 1 for each additional charge you expend. The wand regains 1d6 + 1 expended charges daily at dawn. If you expend the wand's last charge, roll 1d20. On a 1, the wand crumbles into ashes and is destroyed."
      , mechanics =
          { family = "activation"
          , condition = { kind = "holding_item" }
          , activationCost = { kind = "standard_action", action = "magic" }
          , resource =
              { kind = "charge_pool"
              , cap = { kind = "fixed", uses = 7 }
              }
          , resetCadence =
              { kind = "dawn"
              , regain =
                  Some
                    { kind = "fixed"
                    , expr = { dice = 1, dieSize = 6, flat = 1 }
                    }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "grant_spell_access"
                      , spellId = "fireball"
                      , mode =
                          { kind = "charge_cast"
                          , baseCharges = 1
                          , perLevelCharges = 1
                          , minLevel = 3
                          , maxLevel = 5
                          }
                      , dcOverride = { kind = "fixed", dc = 15 }
                      }
                    ]
                }
              ]
          }
      , destruction =
          { kind = "last_charge_roll", die = 20, destroyOn = 1 }
      }

in  wand
