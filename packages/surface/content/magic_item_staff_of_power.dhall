-- Staff of Power — SRD 5.2.1 magic item (very rare, attunement by a
-- Sorcerer, Warlock, or Wizard).
--
-- Honest fit to the current surface:
--   • composite magic item
--   • passive held-item staff bonuses (+2 attack/damage with the staff,
--     +2 AC, +2 saves, +2 spell attack rolls)
--   • charge-based spellcasting from the staff
--   • dawn recharge
--
-- Explicit omission recorded in proposal/result:
--   • last-charge rider. The current surface cannot express the
--     non-destructive partial shutdown on a 1, nor the recharge branch
--     on a 20 after the last charge is spent.
--   • Retributive Strike. The current surface cannot express damage
--     proportional to remaining charges with a fixed multiplier
--     ("16 times the number of charges", "4 times the number of charges"),
--     nor deterministic destruction triggered by a dedicated activation.

let ChargeCast =
      { kind : Text
      , baseCharges : Natural
      , perLevelCharges : Natural
      , minLevel : Natural
      , maxLevel : Natural
      }

let SpecificItemFilter = { kind : Text, itemId : Text }

let PassiveEffect =
      { kind : Text
      , delta : { kind : Text, dice : Natural, dieSize : Natural, sign : Text }
      , on : Optional (List Text)
      , weaponFilter : Optional SpecificItemFilter
      }

let ActivationEffect =
      { kind : Text
      , spellId : Text
      , mode : ChargeCast
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
      , effects : List ActivationEffect
      }

let MagicItemPart =
      { family : Text
      , condition : Optional HoldingItemCondition
      , grants : Optional (List PassiveEffect)
      , activationCost : Optional ActivationCost
      , resource : Optional ChargePool
      , resetCadence : Optional DawnRegain
      , phases : Optional (List DirectPhase)
      }

let AttunementRestriction =
      { kind : Text
      , classes : Optional (List Text)
      }

let staffOfPower =
      { kind = "magic_item"
      , id = "magic_item_staff_of_power"
      , name = "Staff of Power"
      , rarity = "very_rare"
      , requiresAttunement = True
      , attunementRestriction =
          Some
            { kind = "class_list"
            , classes =
                Some ["sorcerer", "warlock", "wizard"]
            }
      : Optional AttunementRestriction
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#StaffOfPower"
          }
      , description =
          "This staff has 20 charges and can be wielded as a magic Quarterstaff that grants a +2 bonus to attack rolls and damage rolls made with it. While holding it, you gain a +2 bonus to Armor Class, saving throws, and spell attack rolls. While holding the staff, you can cast Cone of Cold (5 charges), Fireball at level 5 (5 charges), Globe of Invulnerability (6 charges), Hold Monster (5 charges), Levitate (2 charges), Lightning Bolt at level 5 (5 charges), Magic Missile (1 charge), Ray of Enfeeblement (1 charge), or Wall of Force (5 charges) from it, using your spell save DC. The staff regains 2d8 + 4 expended charges daily at dawn. The special last-charge rider and Retributive Strike are omitted from this authored subset; see proposal-magic_item_staff_of_power.md."
      , mechanics =
          { family = "composite"
          , parts =
              [ { family = "passive"
                , condition = Some { kind = "holding_item" }
                , grants =
                    Some
                      [ { kind = "modify_roll_numeric"
                        , delta =
                            { kind = "fixed_dice"
                            , dice = 2
                            , dieSize = 1
                            , sign = "+"
                            }
                        , on = Some ["attack_roll"]
                        , weaponFilter =
                            Some
                              { kind = "specific_item"
                              , itemId = "magic_item_staff_of_power"
                              }
                        }
                      , { kind = "modify_damage_numeric"
                        , delta =
                            { kind = "fixed_dice"
                            , dice = 2
                            , dieSize = 1
                            , sign = "+"
                            }
                        , on = None (List Text)
                        , weaponFilter =
                            Some
                              { kind = "specific_item"
                              , itemId = "magic_item_staff_of_power"
                              }
                        }
                      , { kind = "modify_ac"
                        , delta =
                            { kind = "fixed_dice"
                            , dice = 2
                            , dieSize = 1
                            , sign = "+"
                            }
                        , on = None (List Text)
                        , weaponFilter = None SpecificItemFilter
                        }
                      , { kind = "modify_roll_numeric"
                        , delta =
                            { kind = "fixed_dice"
                            , dice = 2
                            , dieSize = 1
                            , sign = "+"
                            }
                        , on = Some ["saving_throw"]
                        , weaponFilter = None SpecificItemFilter
                        }
                      , { kind = "modify_roll_numeric"
                        , delta =
                            { kind = "fixed_dice"
                            , dice = 2
                            , dieSize = 1
                            , sign = "+"
                            }
                        , on = Some ["spell_attack_roll"]
                        , weaponFilter = None SpecificItemFilter
                        }
                      ]
                , activationCost = None ActivationCost
                , resource = None ChargePool
                , resetCadence = None DawnRegain
                , phases = None (List DirectPhase)
                }
              , { family = "activation"
                , condition = Some { kind = "holding_item" }
                , grants = None (List PassiveEffect)
                , activationCost = Some { kind = "standard_action", action = "magic" }
                , resource =
                    Some
                      { kind = "charge_pool"
                      , cap = { kind = "fixed", uses = 20 }
                      }
                , resetCadence =
                    Some
                      { kind = "dawn"
                      , regain =
                          Some
                            { kind = "fixed"
                            , expr = { dice = 2, dieSize = 8, flat = 4 }
                            }
                      }
                , phases =
                    Some
                      [ { kind = "direct"
                        , attachment = { kind = "self" }
                        , effects =
                            [ { kind = "grant_spell_access"
                              , spellId = "cone_of_cold"
                              , mode =
                                  { kind = "charge_cast"
                                  , baseCharges = 5
                                  , perLevelCharges = 0
                                  , minLevel = 5
                                  , maxLevel = 5
                                  }
                              }
                            , { kind = "grant_spell_access"
                              , spellId = "fireball"
                              , mode =
                                  { kind = "charge_cast"
                                  , baseCharges = 5
                                  , perLevelCharges = 0
                                  , minLevel = 5
                                  , maxLevel = 5
                                  }
                              }
                            , { kind = "grant_spell_access"
                              , spellId = "globe_of_invulnerability"
                              , mode =
                                  { kind = "charge_cast"
                                  , baseCharges = 6
                                  , perLevelCharges = 0
                                  , minLevel = 6
                                  , maxLevel = 6
                                  }
                              }
                            , { kind = "grant_spell_access"
                              , spellId = "hold_monster"
                              , mode =
                                  { kind = "charge_cast"
                                  , baseCharges = 5
                                  , perLevelCharges = 0
                                  , minLevel = 5
                                  , maxLevel = 5
                                  }
                              }
                            , { kind = "grant_spell_access"
                              , spellId = "levitate"
                              , mode =
                                  { kind = "charge_cast"
                                  , baseCharges = 2
                                  , perLevelCharges = 0
                                  , minLevel = 2
                                  , maxLevel = 2
                                  }
                              }
                            , { kind = "grant_spell_access"
                              , spellId = "lightning_bolt"
                              , mode =
                                  { kind = "charge_cast"
                                  , baseCharges = 5
                                  , perLevelCharges = 0
                                  , minLevel = 5
                                  , maxLevel = 5
                                  }
                              }
                            , { kind = "grant_spell_access"
                              , spellId = "magic_missile"
                              , mode =
                                  { kind = "charge_cast"
                                  , baseCharges = 1
                                  , perLevelCharges = 0
                                  , minLevel = 1
                                  , maxLevel = 1
                                  }
                              }
                            , { kind = "grant_spell_access"
                              , spellId = "ray_of_enfeeblement"
                              , mode =
                                  { kind = "charge_cast"
                                  , baseCharges = 1
                                  , perLevelCharges = 0
                                  , minLevel = 2
                                  , maxLevel = 2
                                  }
                              }
                            , { kind = "grant_spell_access"
                              , spellId = "wall_of_force"
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
              ]
          }
      , destruction = { kind = "none" }
      }

in  staffOfPower
