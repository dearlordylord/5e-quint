-- Rod of Resurrection — SRD 5.2.1 magic item (legendary, attunement).
--
-- RAW (Magic Items):
--   "The rod has 5 charges. While you hold it, you can cast one of the
--    following spells from it: Heal (expends 1 charge) or Resurrection
--    (expends 5 charges)."
--   "The rod regains 1 expended charge daily at dawn. If you expend the
--    last charge, roll 1d20. On a 1, the rod disappears in a harmless
--    burst of radiance."
--
-- Clean fit to the existing magic-item activation surface:
--   • ActivationResource.charge_pool (5 charges)
--   • RestResetCadence.dawn with regain = 1
--   • multiple grant_spell_access effects, each using charge_cast at a
--     fixed spell level
--   • ItemDestructionPolicy.last_charge_roll (d20, destroyOn=1)

let rod =
      { kind = "magic_item"
      , id = "magic_item_rod_of_resurrection"
      , name = "Rod of Resurrection"
      , rarity = "legendary"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#RodOfResurrection"
          }
      , description =
          "The rod has 5 charges. While you hold it, you can cast one of the following spells from it: Heal (expends 1 charge) or Resurrection (expends 5 charges). The rod regains 1 expended charge daily at dawn. If you expend the last charge, roll 1d20. On a 1, the rod disappears in a harmless burst of radiance."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "action" }
          , resource =
              { kind = "charge_pool"
              , cap = { kind = "fixed", uses = 5 }
              }
          , resetCadence =
              { kind = "dawn"
              , regain =
                  Some
                    { kind = "fixed"
                    , expr = { dice = 1, dieSize = 1 }
                    }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "grant_spell_access"
                      , spellId = "heal"
                      , mode =
                          { kind = "charge_cast"
                          , baseCharges = 1
                          , perLevelCharges = 0
                          , minLevel = 6
                          , maxLevel = 6
                          }
                      }
                    , { kind = "grant_spell_access"
                      , spellId = "resurrection"
                      , mode =
                          { kind = "charge_cast"
                          , baseCharges = 5
                          , perLevelCharges = 0
                          , minLevel = 7
                          , maxLevel = 7
                          }
                      }
                    ]
                }
              ]
          }
      , destruction =
          { kind = "last_charge_roll", die = 20, destroyOn = 1 }
      }

in  rod
