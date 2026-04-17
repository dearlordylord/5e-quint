-- Potion of Heroism — SRD 5.2.1 magic item (potion, rare).
--
-- RAW:
--   "When you drink this potion, you gain 10 Temporary Hit Points that
--    last for 1 hour. For the same duration, you are under the effect
--    of the Bless spell (no Concentration required)."
--
-- Encoded as a single-use activated magic item:
--   • activationCost = action (drink the potion)
--   • resource = use_count 1, resetCadence = never
--   • destruction = permanent_on_empty
--   • duration = timed 1 hour (the Bless-equivalent rider does not
--     require concentration because the duration is item-timed, not a
--     spell concentration lock)
--
-- "Under the effect of the Bless spell" contributes only Bless's
-- mechanical rider: +1d4 to attack rolls and saving throws.

let potionOfHeroism =
      { kind = "magic_item"
      , id = "magic_item_potion_of_heroism"
      , name = "Potion of Heroism"
      , rarity = "rare"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#Potion of Heroism"
          }
      , description =
          "When you drink this potion, you gain 10 Temporary Hit Points that last for 1 hour. For the same duration, you are under the effect of the Bless spell (no Concentration required)."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "action" }
          , resource =
              { kind = "use_count"
              , cap = { kind = "fixed", uses = 1 }
              }
          , resetCadence = { kind = "never" }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              }
          , phases =
              let Effect
                    : Type
                    = { kind : Text
                      , amount :
                          Optional
                            { kind : Text
                            , expr :
                                { dice : Natural
                                , dieSize : Natural
                                , flat : Natural
                                }
                            }
                      , delta :
                          Optional
                            { kind : Text
                            , dice : Natural
                            , dieSize : Natural
                            , sign : Text
                            }
                      , on : Optional (List Text)
                      }
              let tempHp
                    : Effect
                    = { kind = "grant_temp_hp"
                      , amount =
                          Some
                            { kind = "fixed"
                            , expr = { dice = 0, dieSize = 1, flat = 10 }
                            }
                      , delta =
                          None
                            { kind : Text
                            , dice : Natural
                            , dieSize : Natural
                            , sign : Text
                            }
                      , on = None (List Text)
                      }
              let blessRider
                    : Effect
                    = { kind = "modify_roll_numeric"
                      , amount =
                          None
                            { kind : Text
                            , expr :
                                { dice : Natural
                                , dieSize : Natural
                                , flat : Natural
                                }
                            }
                      , delta =
                          Some
                            { kind = "fixed_dice"
                            , dice = 1
                            , dieSize = 4
                            , sign = "+"
                            }
                      , on = Some [ "attack_roll", "saving_throw" ]
                      }
              in  [ { kind = "direct"
                    , attachment = { kind = "self" }
                    , effects = [ tempHp, blessRider ]
                    }
                  ]
          }
      , destruction = { kind = "permanent_on_empty" }
      }

in  potionOfHeroism
