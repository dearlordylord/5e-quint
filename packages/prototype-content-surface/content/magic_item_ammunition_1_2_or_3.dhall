-- Ammunition, +1, +2, or +3 — SRD 5.2.1 magic ammunition template.
let Delta = { kind : Text, dice : Natural, dieSize : Natural, sign : Text }

let WeaponFilter = { kind : Text, itemId : Optional Text }

let SourceItemFilter = { kind = "source_item", itemId = None Text }

let Effect =
      { kind : Text
      , delta : Delta
      , on : Optional (List Text)
      , weaponFilter : Optional WeaponFilter
      }

let Condition = { kind : Text }

let MagicTrait =
      { rarity : Text
      , attunement : { requiresAttunement : Bool }
      , mechanics :
          { family : Text
          , condition : Optional Condition
          , grants : List Effect
          }
      , destruction : { kind : Text }
      }

let Variant = { id : Text, name : Text, magic : MagicTrait }

let attackBonus =
      \(n : Natural) ->
        { kind = "modify_roll_numeric"
        , delta = { kind = "fixed_dice", dice = n, dieSize = 1, sign = "+" }
        , on = Some [ "attack_roll" ]
        , weaponFilter = Some SourceItemFilter
        }

let damageBonus =
      \(n : Natural) ->
        { kind = "modify_damage_numeric"
        , delta = { kind = "fixed_dice", dice = n, dieSize = 1, sign = "+" }
        , on = None (List Text)
        , weaponFilter = Some SourceItemFilter
        }

let variant =
      \(id : Text) ->
      \(name : Text) ->
      \(rarity : Text) ->
      \(n : Natural) ->
        { id
        , name
        , magic =
          { rarity
          , attunement.requiresAttunement = False
          , mechanics =
            { family = "passive"
            , condition = None Condition
            , grants = [ attackBonus n, damageBonus n ]
            }
          , destruction.kind = "becomes_nonmagical_on_hit"
          }
        }

let ammunition =
      { kind = "weapon_template"
      , template = "ammunition_magic"
      , id = "magic_item_ammunition_1_2_or_3"
      , name = "Ammunition, +1, +2, or +3"
      , provenance =
        { kind = "srd-5.2.1", section = "MagicItems#Ammunition+1+2or+3" }
      , description =
          "You have a bonus to attack rolls and damage rolls made with this piece of magic ammunition. Once it hits a target, the ammunition is no longer magical. Ammunition is typically found or sold in quantities of ten or twenty pieces; ten pieces are equivalent in value to a potion of the same rarity."
      , ammunitionQuantity =
        { kind = "typically_found_or_sold"
        , counts = [ 10, 20 ]
        , valueEquivalence = { count = 10, item = "potion_of_same_rarity" }
        }
      , weaponApplicability.kind = "ammunition"
      , variants =
            [ variant
                "magic_item_ammunition_plus_1"
                "Ammunition, +1"
                "uncommon"
                1
            , variant "magic_item_ammunition_plus_2" "Ammunition, +2" "rare" 2
            , variant
                "magic_item_ammunition_plus_3"
                "Ammunition, +3"
                "very_rare"
                3
            ]
          : List Variant
      }

in  ammunition
