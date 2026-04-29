-- Potion of Animal Friendship — SRD 5.2.1 magic item (potion, uncommon).
--
-- RAW (Magic-Items / Items I-P / Potion of Animal Friendship):
--   "When you drink this potion, you can cast the level 3 version of the
--    Animal Friendship spell (save DC 13)."
--
-- Level 3 Animal Friendship = choose_up_to 3 Beasts (base 1 + 2 extra
-- from slots 2 and 3 per higher-slot rule).
-- Fixed DC 13 overrides the normal caster spell save DC.
-- Duration 24 hours non-concentration, earlyEnd = target_damaged_by_caster_or_ally
-- (inherited from the Animal Friendship spell per "you can cast the level
-- 3 version of the Animal Friendship spell").
--
-- Family: activation (single-use consumable).
-- Destruction: permanent_on_empty (potion consumed on use).

let potionOfAnimalFriendship =
      { kind = "magic_item"
      , id = "magic_item_potion_of_animal_friendship"
      , name = "Potion of Animal Friendship"
      , rarity = "uncommon"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#Potion of Animal Friendship"
          }
      , description =
          "When you drink this potion, you can cast the level 3 version of the Animal Friendship spell (save DC 13). Agitating this potion's muddy liquid brings little bits into view: a fish scale, a hummingbird feather, a cat claw, or a squirrel hair."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "standard_action", action = "magic" }
          , resource =
              { kind = "use_count"
              , cap = { kind = "fixed", uses = 1 }
              }
          , resetCadence = { kind = "never" }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 24 }
              , earlyEnd =
                  [ { kind = "target_damaged_by_caster_or_ally" } ]
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "magic_item_potion_of_animal_friendship_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "choose_up_to"
                            , count = 3
                            , typeFilter = [ "beast" ]
                            }
                        }
                    }
                , ability = "wis"
                , dc = { kind = "fixed", dc = 13 }
                , onFail =
                    { kind = "apply_condition"
                    , condition = "charmed"
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      , destruction = { kind = "permanent_on_empty" }
      }

in  potionOfAnimalFriendship
