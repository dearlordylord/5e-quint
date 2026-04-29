-- Staff of Fire — SRD 5.2.1 magic item (very rare, attunement).
--
-- RAW (Magic Items):
--   "You have Resistance to Fire damage while you hold this staff."
--   "The staff has 10 charges. While holding the staff, you can cast
--    one of the spells on the following table from it, using your spell
--    save DC. The table indicates how many charges you must expend to
--    cast the spell."
--   "Burning Hands: 1; Fireball: 3; Wall of Fire: 4."
--   "The staff regains 1d6 + 4 expended charges daily at dawn. If you
--    expend the last charge, roll 1d20. On a 1, the staff crumbles into
--    cinders and is destroyed."
--
-- Honest fit to the current magic-item surface:
--   • MagicItemMechanics.composite
--   • passive held-item grant for Fire resistance
--   • activation charge_pool for charge-cast spells
--   • dawn recharge
--   • last-charge destruction roll
--
let ChargeCast =
      { kind : Text
      , baseCharges : Natural
      , perLevelCharges : Natural
      , minLevel : Natural
      , maxLevel : Natural
      }

let GrantResistanceOrSpellAccess =
      { kind : Text
      , damageType : Optional Text
      , spellId : Optional Text
      , mode : Optional ChargeCast
      }

let HoldingItemCondition = { kind : Text }

let DawnRegain =
      { kind : Text
      , regain :
          Optional
            { kind : Text
            , expr : { dice : Natural, dieSize : Natural, flat : Natural }
            }
      }

let ChargePool =
      { kind : Text
      , cap : { kind : Text, uses : Natural }
      }

let ActivationCost = { kind : Text }

let DirectPhase =
      { kind : Text
      , attachment : { kind : Text }
      , effects : List GrantResistanceOrSpellAccess
      }

let MagicItemPart =
      { family : Text
      , condition : Optional HoldingItemCondition
      , grants : Optional (List GrantResistanceOrSpellAccess)
      , activationCost : Optional ActivationCost
      , resource : Optional ChargePool
      , resetCadence : Optional DawnRegain
      , phases : Optional (List DirectPhase)
      }

let AttunementRestriction =
      { kind : Text
      , classes : Optional (List Text)
      }

let staffOfFire =
      { kind = "magic_item"
      , id = "magic_item_staff_of_fire"
      , name = "Staff of Fire"
      , rarity = "very_rare"
      , requiresAttunement = True
      , attunementRestriction =
          Some
            { kind = "class_list"
            , classes =
                Some ["druid", "sorcerer", "warlock", "wizard"]
            }
      : Optional AttunementRestriction
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#StaffOfFire"
          }
      , description =
          "You have Resistance to Fire damage while you hold this staff. The staff has 10 charges. While holding the staff, you can cast Burning Hands (1 charge), Fireball (3 charges), or Wall of Fire (4 charges) from it, using your spell save DC. The staff regains 1d6 + 4 expended charges daily at dawn. If you expend the last charge, roll 1d20. On a 1, the staff crumbles into cinders and is destroyed."
      , mechanics =
          { family = "composite"
          , parts =
              [ { family = "passive"
                , condition = Some { kind = "holding_item" }
                , grants =
                    Some
                      [ { kind = "grant_resistance"
                        , damageType = Some "fire"
                        , spellId = None Text
                        , mode = None ChargeCast
                        }
                      ]
                , activationCost = None ActivationCost
                , resource = None ChargePool
                , resetCadence = None DawnRegain
                , phases = None (List DirectPhase)
                }
              , { family = "activation"
                , condition = None HoldingItemCondition
                , grants = None (List GrantResistanceOrSpellAccess)
                , activationCost = Some { kind = "standard_action", action = "magic" }
                , resource =
                    Some
                      { kind = "charge_pool"
                      , cap = { kind = "fixed", uses = 10 }
                      }
                , resetCadence =
                    Some
                      { kind = "dawn"
                      , regain =
                          Some
                            { kind = "fixed"
                            , expr = { dice = 1, dieSize = 6, flat = 4 }
                            }
                      }
                , phases =
                    Some
                      [ { kind = "direct"
                        , attachment = { kind = "self" }
                        , effects =
                            [ { kind = "grant_spell_access"
                              , damageType = None Text
                              , spellId = Some "burning_hands"
                              , mode =
                                  Some
                                    { kind = "charge_cast"
                                    , baseCharges = 1
                                    , perLevelCharges = 0
                                    , minLevel = 1
                                    , maxLevel = 1
                                    }
                              }
                            , { kind = "grant_spell_access"
                              , damageType = None Text
                              , spellId = Some "fireball"
                              , mode =
                                  Some
                                    { kind = "charge_cast"
                                    , baseCharges = 3
                                    , perLevelCharges = 0
                                    , minLevel = 3
                                    , maxLevel = 3
                                    }
                              }
                            , { kind = "grant_spell_access"
                              , damageType = None Text
                              , spellId = Some "wall_of_fire"
                              , mode =
                                  Some
                                    { kind = "charge_cast"
                                    , baseCharges = 4
                                    , perLevelCharges = 0
                                    , minLevel = 4
                                    , maxLevel = 4
                                    }
                              }
                            ]
                        }
                      ]
                }
              ]
          }
      , destruction =
          { kind = "last_charge_roll", die = 20, destroyOn = 1 }
      }

in  staffOfFire
