-- Ammunition, +1, +2, or +3 — SRD 5.2.1 magic item collection.
--
-- Honest fit to the current surface:
--   • magic_item collection with three rarity variants
--   • passive bonuses to attack rolls and damage rolls made with the
--     specific piece of ammunition
--
-- Explicit omission recorded in proposal/result:
--   • "Once it hits a target, the ammunition is no longer magical."
--     The current surface has no passive-item lifecycle hook keyed to
--     a successful hit, so the authored subset captures only the
--     attack/damage bonus.

let SpecificItemFilter = { kind : Text, itemId : Text }

let PassiveEffect =
      { kind : Text
      , delta : { kind : Text, dice : Natural, dieSize : Natural, sign : Text }
      , on : Optional (List Text)
      , weaponFilter : Optional SpecificItemFilter
      }

let PassiveMechanics =
      { family : Text
      , grants : List PassiveEffect
      }

let Variant =
      { id : Text
      , name : Text
      , rarity : Text
      , mechanics : PassiveMechanics
      , destruction : { kind : Text }
      }

let bonusEffects =
      λ(itemId : Text) →
      λ(bonus : Natural) →
        [ { kind = "modify_roll_numeric"
          , delta =
              { kind = "fixed_dice"
              , dice = bonus
              , dieSize = 1
              , sign = "+"
              }
          , on = Some ["attack_roll"]
          , weaponFilter = Some { kind = "specific_item", itemId }
          }
        , { kind = "modify_damage_numeric"
          , delta =
              { kind = "fixed_dice"
              , dice = bonus
              , dieSize = 1
              , sign = "+"
              }
          , on = None (List Text)
          , weaponFilter = Some { kind = "specific_item", itemId }
          }
        ]

let mkVariant =
      λ(id : Text) →
      λ(name : Text) →
      λ(rarity : Text) →
      λ(bonus : Natural) →
        { id = id
        , name = name
        , rarity = rarity
        , mechanics =
            { family = "passive"
            , grants = bonusEffects id bonus
            }
        , destruction = { kind = "none" }
        }

let ammunition =
      { kind = "magic_item"
      , id = "magic_item_ammunition_1_2_or_3"
      , name = "Ammunition, +1, +2, or +3"
      , defaultAttunement = { requiresAttunement = False }
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#Ammunition+1+2or+3"
          }
      , description =
          "You have a bonus to attack rolls and damage rolls made with this piece of magic ammunition. The bonus is determined by the rarity of the ammunition. Once it hits a target, the ammunition is no longer magical. This authored subset captures the attack and damage bonuses only; the on-hit loss of magic is omitted pending a passive-item lifecycle hook."
      , variants =
          [ mkVariant
              "magic_item_ammunition_plus_1"
              "Ammunition, +1"
              "uncommon"
              1
          , mkVariant
              "magic_item_ammunition_plus_2"
              "Ammunition, +2"
              "rare"
              2
          , mkVariant
              "magic_item_ammunition_plus_3"
              "Ammunition, +3"
              "very_rare"
              3
          ]
      }

in  ammunition
