-- Armor, +1, +2, or +3 — SRD 5.2.1 magic armor template.
--
-- This remains top-level kind = "armor": the object occupying the armor
-- slot is armor first. Magic-item facts are metadata/traits of that armor,
-- not a competing record identity.

let Delta = { kind : Text, dice : Natural, dieSize : Natural, sign : Text }

let Grant = { kind : Text, delta : Delta }

let MagicTrait =
      { rarity : Text
      , attunement : { requiresAttunement : Bool }
      , grants : List Grant
      , destruction : { kind : Text }
      }

let Variant =
      { id : Text
      , name : Text
      , magic : MagicTrait
      }

let acBonus = \(n : Natural) ->
      { kind = "modify_ac"
      , delta = { kind = "fixed_dice", dice = n, dieSize = 1, sign = "+" }
      }

let variant = \(id : Text) -> \(name : Text) -> \(rarity : Text) -> \(n : Natural) ->
      { id
      , name
      , magic =
          { rarity
          , attunement = { requiresAttunement = False }
          , grants = [ acBonus n ]
          , destruction = { kind = "none" }
          }
      }

let armor =
      { kind = "armor"
      , template = "any_armor_magic"
      , id = "magic_item_armor_1_2_or_3"
      , name = "Armor, +1, +2, or +3"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#Armor+1+2or+3"
          }
      , description =
          "While wearing this armor, you have a bonus to Armor Class determined by the armor's rarity."
      , armorApplicability =
          { kind = "any_armor"
          , categories = [ "light", "medium", "heavy" ]
          }
      , variants =
          [ variant "magic_item_armor_plus_1" "Armor, +1" "rare" 1
          , variant "magic_item_armor_plus_2" "Armor, +2" "very_rare" 2
          , variant "magic_item_armor_plus_3" "Armor, +3" "legendary" 3
          ] : List Variant
      }

in  armor
