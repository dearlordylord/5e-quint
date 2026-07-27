-- Shield, +1, +2, or +3 — SRD 5.2.1 magic shield template.
let Delta = { kind : Text, dice : Natural, dieSize : Natural, sign : Text }

let Effect = { kind : Text, delta : Delta }

let Condition = { kind : Text }

let Mechanics =
      { family : Text, condition : Optional Condition, grants : List Effect }

let MagicTrait =
      { rarity : Text
      , attunement : { requiresAttunement : Bool }
      , mechanics : Mechanics
      , destruction : { kind : Text }
      }

let Variant = { id : Text, name : Text, magic : MagicTrait }

let acBonus =
      \(n : Natural) ->
        { kind = "modify_ac"
        , delta = { kind = "fixed_dice", dice = n, dieSize = 1, sign = "+" }
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
            , condition = Some { kind = "holding_item" }
            , grants = [ acBonus n ]
            }
          , destruction.kind = "none"
          }
        }

let shield =
      { kind = "shield_template"
      , template = "shield_magic"
      , id = "magic_item_shield_1_2_or_3"
      , name = "Shield, +1, +2, or +3"
      , provenance =
        { kind = "srd-5.2.1", section = "Magic-Items/Items-Q-Z.md#Shield, +1, +2, or +3" }

      , armorClassProjection =
        { kind = "trained_shield_bonus"
        , handUse = "shield"
        , trainingRequired = "shield"
        , bonus = 2
        }
      , weightPounds = 6
      , costGp = 10
      , donDoff.action = "utilize"
      , variants =
            [ variant "magic_item_shield_plus_1" "Shield, +1" "uncommon" 1
            , variant "magic_item_shield_plus_2" "Shield, +2" "rare" 2
            , variant "magic_item_shield_plus_3" "Shield, +3" "very_rare" 3
            ]
          : List Variant
      }

in  shield
