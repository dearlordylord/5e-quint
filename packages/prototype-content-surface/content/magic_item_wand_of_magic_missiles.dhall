-- Wand of Magic Missiles — SRD 5.2.1 magic item (uncommon).
--
-- RAW (Magic-Items / Items Q-Z):
--   "This wand has 7 charges. While holding it, you can expend no more
--    than 3 charges to cast Magic Missile from it. For 1 charge, you
--    cast the level 1 version of the spell. You can increase the
--    spell's level by 1 for each additional charge you expend."
--   "Regaining Charges. The wand regains 1d6 + 1 expended charges
--    daily at dawn. If you expend the wand's last charge, roll 1d20.
--    On a 1, the wand crumbles into ashes and is destroyed."
--
-- Consolidated validation reference for the charge_cast cluster:
--   • ActivationResource.charge_pool (pool with variable per-use cost)
--   • RestResetCadence.dawn with regain = DiceAmount "1d6 + 1"
--   • grant_spell_access.mode.charge_cast (chargesPerLevel=1, L1–L3)
--   • ItemDestructionPolicy.last_charge_roll (d20, destroyOn=1)
--
-- The Magic action activation cost is implicit in SRD for items you
-- hold; activationCost = "action" matches RAW ("you can take a Magic
-- action to expend charges..." — the Wand of Magic Missiles text omits
-- the explicit "Magic action" because SRD Overview sets it by default
-- for held items that call out charge expenditure).

let wand =
      { kind = "magic_item"
      , id = "magic_item_wand_of_magic_missiles"
      , name = "Wand of Magic Missiles"
      , rarity = "uncommon"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#WandOfMagicMissiles"
          }
      , description =
          "This wand has 7 charges. While holding it, you can expend no more than 3 charges to cast Magic Missile from it. For 1 charge, you cast the level 1 version of the spell. You can increase the spell's level by 1 for each additional charge you expend. The wand regains 1d6 + 1 expended charges daily at dawn. If you expend the wand's last charge, roll 1d20. On a 1, the wand crumbles into ashes and is destroyed."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "action" }
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
                      , spellId = "magic_missile"
                      , mode =
                          { kind = "charge_cast"
                          , baseCharges = 1
                          , perLevelCharges = 1
                          , minLevel = 1
                          , maxLevel = 3
                          }
                      }
                    ]
                }
              ]
          }
      , destruction =
          { kind = "last_charge_roll", die = 20, destroyOn = 1 }
      }

in  wand
