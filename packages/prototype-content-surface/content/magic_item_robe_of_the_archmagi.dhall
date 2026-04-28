-- Robe of the Archmagi — SRD 5.2.1 magic item (legendary, requires
-- attunement by a Sorcerer, Warlock, or Wizard).
--
-- Honest fit to the current surface:
--   • composite magic item with two passive parts
--   • general worn-item benefits: Magic Resistance, +2 spell save DC,
--     +2 spell attack rolls
--   • narrower worn-and-unarmored AC formula replacement

let DiceDelta = { kind : Text, dice : Natural, dieSize : Natural, sign : Text }

let SavingThrowSourceFilter = { kind : Text }

let BaseAcFormula = { kind : Text, base : Natural }

let EffectRow =
      { kind : Text
      , delta : Optional DiceDelta
      , formula : Optional BaseAcFormula
      , mode : Optional Text
      , on : Optional (List Text)
      , saveSourceFilter : Optional SavingThrowSourceFilter
      }

let SimplePredicate = { kind : Text }

let EquipmentPredicate =
      { kind : Text
      , predicates : Optional (List SimplePredicate)
      }

let PassivePart =
      { family : Text
      , condition : Optional EquipmentPredicate
      , grants : Optional (List EffectRow)
      }

let AttunementRestriction =
      { kind : Text
      , classes : Optional (List Text)
      }

let robeOfTheArchmagi =
      { kind = "magic_item"
      , id = "magic_item_robe_of_the_archmagi"
      , name = "Robe of the Archmagi"
      , rarity = "legendary"
      , requiresAttunement = True
      , attunementRestriction =
          Some
            { kind = "class_list"
            , classes = Some ["sorcerer", "warlock", "wizard"]
            }
      : Optional AttunementRestriction
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#RobeOfTheArchmagi"
          }
      , description =
          "You gain these benefits while wearing the robe. Armor: if you aren't wearing armor, your base Armor Class is 15 plus your Dexterity modifier. Magic Resistance: you have Advantage on saving throws against spells and other magical effects. War Mage: your spell save DC and spell attack bonus each increase by 2."
      , mechanics =
          { family = "composite"
          , parts =
              [ { family = "passive"
                , condition =
                    Some
                      { kind = "wearing_item"
                      , predicates = None (List SimplePredicate)
                      }
                , grants =
                    Some
                      [ { kind = "modify_roll_advantage"
                        , delta = None DiceDelta
                        , formula = None BaseAcFormula
                        , mode = Some "advantage"
                        , on = Some ["saving_throw"]
                        , saveSourceFilter =
                            Some { kind = "spell_or_other_magical_effect" }
                        }
                      , { kind = "modify_save_dc"
                        , delta =
                            Some
                              { kind = "fixed_dice"
                              , dice = 2
                              , dieSize = 1
                              , sign = "+"
                              }
                        , formula = None BaseAcFormula
                        , mode = None Text
                        , on = None (List Text)
                        , saveSourceFilter = None SavingThrowSourceFilter
                        }
                      , { kind = "modify_roll_numeric"
                        , delta =
                            Some
                              { kind = "fixed_dice"
                              , dice = 2
                              , dieSize = 1
                              , sign = "+"
                              }
                        , formula = None BaseAcFormula
                        , mode = None Text
                        , on = Some ["spell_attack_roll"]
                        , saveSourceFilter = None SavingThrowSourceFilter
                        }
                      ]
                }
              , { family = "passive"
                , condition =
                    Some
                      { kind = "all_of"
                      , predicates =
                          Some
                            [ { kind = "wearing_item" }
                            , { kind = "unarmored" }
                            ]
                      }
                , grants =
                    Some
                      [ { kind = "modify_ac_set_base"
                        , delta = None DiceDelta
                        , formula =
                            Some
                              { kind = "base_plus_dex"
                              , base = 15
                              }
                        , mode = None Text
                        , on = None (List Text)
                        , saveSourceFilter = None SavingThrowSourceFilter
                        }
                      ]
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  robeOfTheArchmagi
