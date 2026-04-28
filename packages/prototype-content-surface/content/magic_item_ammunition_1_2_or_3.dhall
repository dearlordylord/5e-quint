-- Ammunition, +1, +2, or +3 — SRD 5.2.1 magic ammunition template.
let Delta = { kind : Text, dice : Natural, dieSize : Natural, sign : Text }

let Effect = { kind : Text, delta : Delta, on : Optional (List Text) }

let MagicTrait =
      { rarity : Text
      , attunement : { requiresAttunement : Bool }
      , mechanics : { family : Text, grants : List Effect }
      , destruction : { kind : Text }
      }

let Variant = { id : Text, name : Text, magic : MagicTrait }

let attackBonus =
      \(n : Natural) ->
        { kind = "modify_roll_numeric"
        , delta = { kind = "fixed_dice", dice = n, dieSize = 1, sign = "+" }
        , on = Some [ "attack_roll" ]
        }

let damageBonus =
      \(n : Natural) ->
        { kind = "modify_damage_numeric"
        , delta = { kind = "fixed_dice", dice = n, dieSize = 1, sign = "+" }
        , on = None (List Text)
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
            { family = "passive", grants = [ attackBonus n, damageBonus n ] }
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
          "You have a bonus to attack rolls and damage rolls made with this piece of magic ammunition. Once it hits a target, the ammunition is no longer magical."
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
