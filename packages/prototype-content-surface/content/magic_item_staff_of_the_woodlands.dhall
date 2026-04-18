-- Staff of the Woodlands — SRD 5.2.1 magic item (rare, attunement by a druid).
--
-- Encoded subset that fits the current surface honestly:
--   • composite magic item
--   • passive held-item weapon bonuses for the staff as a magic Quarterstaff
--   • charge-based spellcasting from the staff
--   • dawn recharge
--   • existing last-charge roll lifecycle shape
--
-- Explicit omissions recorded in proposal/result:
--   • "+2 bonus to spell attack rolls while holding it" has no spell-attack-only
--     narrowing on modify_roll_numeric (attack_roll would overgrant).
--   • Tree Form needs item/object attachment + revert/fall semantics not in the
--     current surface.
--   • On last-charge failure the item becomes a nonmagical Quarterstaff, which is
--     not the same lifecycle as the existing destruction policy.

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
            , expr : { dice : Natural, dieSize : Natural, flat : Optional Natural }
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

let staffOfTheWoodlands =
      { kind = "magic_item"
      , id = "magic_item_staff_of_the_woodlands"
      , name = "Staff of the Woodlands"
      , rarity = "rare"
      , requiresAttunement = True
      , attunementRestriction =
          Some
            { kind = "class_list"
            , classes = Some ["druid"]
            }
      : Optional AttunementRestriction
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#StaffOfTheWoodlands"
          }
      , description =
          "This staff has 6 charges and can be wielded as a magic Quarterstaff that grants a +2 bonus to attack rolls and damage rolls made with it. While holding it, you have a +2 bonus to spell attack rolls. While holding the staff, you can cast Animal Friendship (1 charge), Awaken (5 charges), Barkskin (2 charges), Locate Animals or Plants (2 charges), Pass without Trace (2 charges), Speak with Animals (1 charge), Speak with Plants (3 charges), or Wall of Thorns (6 charges) from it, using your spell save DC. Tree Form: you can expend 1 charge to transform the staff into a healthy tree and later return it to staff form; any creature in the tree falls when it reverts. The staff regains 1d6 expended charges daily at dawn. If you expend the last charge, roll 1d20. On a 1, the staff loses its properties and becomes a nonmagical Quarterstaff."
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
                              , itemId = "magic_item_staff_of_the_woodlands"
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
                              , itemId = "magic_item_staff_of_the_woodlands"
                              }
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
                , activationCost = Some { kind = "action" }
                , resource =
                    Some
                      { kind = "charge_pool"
                      , cap = { kind = "fixed", uses = 6 }
                      }
                , resetCadence =
                    Some
                      { kind = "dawn"
                      , regain =
                          Some
                            { kind = "fixed"
                            , expr =
                                { dice = 1
                                , dieSize = 6
                                , flat = None Natural
                                }
                            }
                      }
                , phases =
                    Some
                      [ { kind = "direct"
                        , attachment = { kind = "self" }
                        , effects =
                            [ { kind = "grant_spell_access"
                              , spellId = "animal_friendship"
                              , mode =
                                  { kind = "charge_cast"
                                  , baseCharges = 1
                                  , perLevelCharges = 0
                                  , minLevel = 1
                                  , maxLevel = 1
                                  }
                              }
                            , { kind = "grant_spell_access"
                              , spellId = "awaken"
                              , mode =
                                  { kind = "charge_cast"
                                  , baseCharges = 5
                                  , perLevelCharges = 0
                                  , minLevel = 5
                                  , maxLevel = 5
                                  }
                              }
                            , { kind = "grant_spell_access"
                              , spellId = "barkskin"
                              , mode =
                                  { kind = "charge_cast"
                                  , baseCharges = 2
                                  , perLevelCharges = 0
                                  , minLevel = 2
                                  , maxLevel = 2
                                  }
                              }
                            , { kind = "grant_spell_access"
                              , spellId = "locate_animals_or_plants"
                              , mode =
                                  { kind = "charge_cast"
                                  , baseCharges = 2
                                  , perLevelCharges = 0
                                  , minLevel = 2
                                  , maxLevel = 2
                                  }
                              }
                            , { kind = "grant_spell_access"
                              , spellId = "pass_without_trace"
                              , mode =
                                  { kind = "charge_cast"
                                  , baseCharges = 2
                                  , perLevelCharges = 0
                                  , minLevel = 2
                                  , maxLevel = 2
                                  }
                              }
                            , { kind = "grant_spell_access"
                              , spellId = "speak_with_animals"
                              , mode =
                                  { kind = "charge_cast"
                                  , baseCharges = 1
                                  , perLevelCharges = 0
                                  , minLevel = 1
                                  , maxLevel = 1
                                  }
                              }
                            , { kind = "grant_spell_access"
                              , spellId = "speak_with_plants"
                              , mode =
                                  { kind = "charge_cast"
                                  , baseCharges = 3
                                  , perLevelCharges = 0
                                  , minLevel = 3
                                  , maxLevel = 3
                                  }
                              }
                            , { kind = "grant_spell_access"
                              , spellId = "wall_of_thorns"
                              , mode =
                                  { kind = "charge_cast"
                                  , baseCharges = 6
                                  , perLevelCharges = 0
                                  , minLevel = 6
                                  , maxLevel = 6
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

in  staffOfTheWoodlands
