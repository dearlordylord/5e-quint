-- Wand of Fear — SRD 5.2.1 magic item (rare, attunement).
--
-- Honest fit to the existing charge-cast magic-item surface for the
-- core item mechanics:
--   • ActivationResource.charge_pool (7 charges)
--   • RestResetCadence.dawn with regain = 1d6 + 1
--   • multiple grant_spell_access effects using charge_cast
--   • grant_spell_access.dcOverride (fixed DC 15)
--   • grant_spell_access.areaOverride (Fear forced to a 60-foot cone)
--   • ItemDestructionPolicy.last_charge_roll (d20, destroyOn=1)
--
-- Known omission recorded in proposal/result:
--   • Command is restricted to the words "flee" or "grovel" only.
--     grant_spell_access can currently override DC / area / target /
--     duration, but not spell-specific mode or option restrictions.

let FixedDc = { kind : Text, dc : Natural }

let ChargeCast =
      { kind : Text
      , baseCharges : Natural
      , perLevelCharges : Natural
      , minLevel : Natural
      , maxLevel : Natural
      }

let AreaOverride = { kind : Text, lengthFeet : Natural }

let GrantSpellAccess =
      { kind : Text
      , spellId : Text
      , mode : ChargeCast
      , dcOverride : Optional FixedDc
      , areaOverride : Optional AreaOverride
      }

let DirectPhase =
      { kind : Text
      , attachment : { kind : Text }
      , effects : List GrantSpellAccess
      }

let wand =
      { kind = "magic_item"
      , id = "magic_item_wand_of_fear"
      , name = "Wand of Fear"
      , rarity = "rare"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#WandOfFear"
          }
      , description =
          "This wand has 7 charges. While holding the wand, you can cast Command (save DC 15; the command word is restricted to \"flee\" or \"grovel\") for 1 charge or Fear (save DC 15; 60-foot Cone) for 3 charges from it. The wand regains 1d6 + 1 expended charges daily at dawn. If you expend the wand's last charge, roll 1d20. On a 1, the wand crumbles into ashes and is destroyed."
      , mechanics =
          { family = "activation"
          , condition = { kind = "holding_item" }
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
                      , spellId = "command"
                      , mode =
                          { kind = "charge_cast"
                          , baseCharges = 1
                          , perLevelCharges = 0
                          , minLevel = 1
                          , maxLevel = 1
                          }
                      , dcOverride = Some { kind = "fixed", dc = 15 }
                      , areaOverride = None AreaOverride
                      }
                    , { kind = "grant_spell_access"
                      , spellId = "fear"
                      , mode =
                          { kind = "charge_cast"
                          , baseCharges = 3
                          , perLevelCharges = 0
                          , minLevel = 3
                          , maxLevel = 3
                          }
                      , dcOverride = Some { kind = "fixed", dc = 15 }
                      , areaOverride =
                          Some { kind = "cone", lengthFeet = 60 }
                      }
                    ]
                }
              ]
          }
      , destruction =
          { kind = "last_charge_roll", die = 20, destroyOn = 1 }
      }

in  wand
