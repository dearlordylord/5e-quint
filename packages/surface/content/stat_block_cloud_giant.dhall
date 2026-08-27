let DiceExpr : Type =
      { dice : Natural
      , dieSize : Natural
      , flat : Optional Natural
      }
let Amount : Type =
      { kind : Text
      , expr : Optional DiceExpr
      , static : Optional Natural
      }
let Effect : Type =
      { amount : Optional Amount
      , condition : Optional Text
      , damageType : Optional Text
      , kind : Text
      , maxCreatureSize : Optional Text
      , timing : Optional Text
      , when : Optional { kind : Text, types : Optional (List Text) }
      }
let damage : Text -> Natural -> Natural -> Natural -> Natural -> Effect =
      λ(damageType : Text) ->
      λ(dice : Natural) ->
      λ(dieSize : Natural) ->
      λ(flat : Natural) ->
      λ(static : Natural) ->
        { amount =
            Some
              { kind = "fixed"
              , expr = Some { dice = dice, dieSize = dieSize, flat = if Natural/isZero flat then None Natural else Some flat }
              , static = Some static
              }
        , condition = None Text
        , damageType = Some damageType
        , kind = "damage"
        , maxCreatureSize = None Text
        , timing = None Text
        , when = None { kind : Text, types : Optional (List Text) }
        }
let staticDamage : Text -> Natural -> Effect =
      λ(damageType : Text) ->
      λ(static : Natural) ->
        { amount =
            Some
              { kind = "fixed"
              , expr = None DiceExpr
              , static = Some static
              }
        , condition = None Text
        , damageType = Some damageType
        , kind = "damage"
        , maxCreatureSize = None Text
        , timing = None Text
        , when = None { kind : Text, types : Optional (List Text) }
        }
let advantageDamage : Text -> Natural -> Natural -> Natural -> Natural -> Effect =
      λ(damageType : Text) ->
      λ(dice : Natural) ->
      λ(dieSize : Natural) ->
      λ(flat : Natural) ->
      λ(static : Natural) ->
        { amount =
            Some
              { kind = "fixed"
              , expr = Some { dice = dice, dieSize = dieSize, flat = if Natural/isZero flat then None Natural else Some flat }
              , static = Some static
              }
        , condition = None Text
        , damageType = Some damageType
        , kind = "conditional_bonus_damage"
        , maxCreatureSize = None Text
        , timing = None Text
        , when =
            Some
              { kind = "attack_roll_had_advantage"
              , types = None (List Text)
              }
        }
let conditionIfSize : Text -> Text -> Effect =
      λ(condition : Text) ->
      λ(maxCreatureSize : Text) ->
        { amount = None Amount
        , condition = Some condition
        , damageType = None Text
        , kind = "apply_condition_if_target_size_at_most"
        , maxCreatureSize = Some maxCreatureSize
        , timing = None Text
        , when = None { kind : Text, types : Optional (List Text) }
        }
let Range : Type = { normal : Natural, long : Natural }
let Area : Type =
      { kind : Text
      , lengthFeet : Optional Natural
      , radiusFeet : Optional Natural
      , widthFeet : Optional Natural
      }
let cone : Natural -> Area =
      λ(lengthFeet : Natural) ->
        { kind = "cone"
        , lengthFeet = Some lengthFeet
        , radiusFeet = None Natural
        , widthFeet = None Natural
        }
let line : Natural -> Natural -> Area =
      λ(lengthFeet : Natural) ->
      λ(widthFeet : Natural) ->
        { kind = "line"
        , lengthFeet = Some lengthFeet
        , radiusFeet = None Natural
        , widthFeet = Some widthFeet
        }
let emanation : Natural -> Area =
      λ(radiusFeet : Natural) ->
        { kind = "emanation"
        , lengthFeet = None Natural
        , radiusFeet = Some radiusFeet
        , widthFeet = None Natural
        }
let ResourceRefs : Type = { kind : Text, ordinals : Optional (List Natural) }
let noneRefs : ResourceRefs =
      { kind = "none", ordinals = None (List Natural) }
let someRefs : List Natural -> ResourceRefs =
      λ(ordinals : List Natural) ->
        { kind = "some", ordinals = Some ordinals }
let ResourceLimit : Type =
      { kind : Text
      , minimumRoll : Optional Natural
      , rest : Optional Text
      , uses : Optional Natural
      }
let recharge : Natural -> ResourceLimit =
      λ(minimumRoll : Natural) ->
        { kind = "recharge"
        , minimumRoll = Some minimumRoll
        , rest = None Text
        , uses = None Natural
        }
let daily : Natural -> ResourceLimit =
      λ(uses : Natural) ->
        { kind = "daily"
        , minimumRoll = None Natural
        , rest = None Text
        , uses = Some uses
        }
let rest : ResourceLimit =
      { kind = "recharge_after_rest"
      , minimumRoll = None Natural
      , rest = Some "short_or_long"
      , uses = None Natural
      }
let resource : Natural -> Text -> ResourceLimit -> { ordinal : Natural, ownership : Text, limit : ResourceLimit } =
      λ(ordinal : Natural) ->
      λ(ownership : Text) ->
      λ(limit : ResourceLimit) ->
        { ordinal = ordinal, ownership = ownership, limit = limit }
let SpellRef : Type =
      { spellId : Text
      , count : Optional Natural
      , castAtLevel : Optional Natural
      , restriction : Optional Text
      }
let spellRef : Text -> Optional Natural -> Optional Natural -> Optional Text -> SpellRef =
      λ(spellId : Text) ->
      λ(count : Optional Natural) ->
      λ(castAtLevel : Optional Natural) ->
      λ(restriction : Optional Text) ->
        { spellId = spellId
        , count = count
        , castAtLevel = castAtLevel
        , restriction = restriction
        }
let Group : Type =
      { kind : Text
      , resourceRefs : ResourceRefs
      , spells : List SpellRef
      }
let atWill : List SpellRef -> Group =
      λ(spells : List SpellRef) ->
        { kind = "at_will", resourceRefs = noneRefs, spells = spells }
let limited : List Natural -> List SpellRef -> Group =
      λ(ordinals : List Natural) ->
      λ(spells : List SpellRef) ->
        { kind = "limited", resourceRefs = someRefs ordinals, spells = spells }
let Components : Type = { v : Bool, s : Bool, m : Bool }
let noComponents : Components = { v = False, s = False, m = False }
let noMaterial : Components = { v = True, s = True, m = False }
let Dispatch : Type =
      { count : { kind : Text, value : Natural }
      , procedureOrdinal : Natural
      }
let Procedure : Type =
      { ability : Optional Text
      , ammunition : Optional Text
      , area : Optional Area
      , attackAbility : Optional Text
      , attackBonus : Optional { kind : Text, value : Natural }
      , attackType : Optional Text
      , components : Optional Components
      , dc : Optional { kind : Text, dc : Natural }
      , dispatches : Optional (List Dispatch)
      , groups : Optional (List Group)
      , kind : Text
      , name : Text
      , onFail : Optional Effect
      , onHit : Optional (List Effect)
      , onSuccess : Optional { kind : Text }
      , rangeFeet : Optional Range
      , reachFeet : Optional Natural
      , spellAttackBonus : Optional { kind : Text, value : Natural }
      , spellSaveDc : Optional { kind : Text, dc : Natural }
      , description : Optional Text
      }
let attack : Text -> Text -> Text -> Natural -> Optional Natural -> Optional Range -> Optional Text -> List Effect -> Optional Text -> Procedure =
      λ(name : Text) ->
      λ(attackType : Text) ->
      λ(attackAbility : Text) ->
      λ(attackBonus : Natural) ->
      λ(reachFeet : Optional Natural) ->
      λ(rangeFeet : Optional Range) ->
      λ(ammunition : Optional Text) ->
      λ(onHit : List Effect) ->
      λ(description : Optional Text) ->
        { ability = None Text
        , ammunition = ammunition
        , area = None Area
        , attackAbility = Some attackAbility
        , attackBonus = Some { kind = "literal", value = attackBonus }
        , attackType = Some attackType
        , components = None Components
        , dc = None { kind : Text, dc : Natural }
        , dispatches = None (List Dispatch)
        , groups = None (List Group)
        , kind = "attack_roll"
        , name = name
        , onFail = None Effect
        , onHit = Some onHit
        , onSuccess = None { kind : Text }
        , rangeFeet = rangeFeet
        , reachFeet = reachFeet
        , spellAttackBonus = None { kind : Text, value : Natural }
        , spellSaveDc = None { kind : Text, dc : Natural }
        , description = description
        }
let save : Text -> Text -> Natural -> Area -> Effect -> { kind : Text } -> Optional Text -> Procedure =
      λ(name : Text) ->
      λ(ability : Text) ->
      λ(dc : Natural) ->
      λ(area : Area) ->
      λ(onFail : Effect) ->
      λ(onSuccess : { kind : Text }) ->
      λ(description : Optional Text) ->
        { ability = Some ability
        , ammunition = None Text
        , area = Some area
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , components = None Components
        , dc = Some { kind = "fixed", dc = dc }
        , dispatches = None (List Dispatch)
        , groups = None (List Group)
        , kind = "save"
        , name = name
        , onFail = Some onFail
        , onHit = None (List Effect)
        , onSuccess = Some onSuccess
        , rangeFeet = None Range
        , reachFeet = None Natural
        , spellAttackBonus = None { kind : Text, value : Natural }
        , spellSaveDc = None { kind : Text, dc : Natural }
        , description = description
        }
let multiattack : Text -> List Dispatch -> Procedure =
      λ(name : Text) ->
      λ(dispatches : List Dispatch) ->
        { ability = None Text
        , ammunition = None Text
        , area = None Area
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , components = None Components
        , dc = None { kind : Text, dc : Natural }
        , dispatches = Some dispatches
        , groups = None (List Group)
        , kind = "multiattack"
        , name = name
        , onFail = None Effect
        , onHit = None (List Effect)
        , onSuccess = None { kind : Text }
        , rangeFeet = None Range
        , reachFeet = None Natural
        , spellAttackBonus = None { kind : Text, value : Natural }
        , spellSaveDc = None { kind : Text, dc : Natural }
        , description = None Text
        }
let spellcasting : Text -> Text -> Optional { kind : Text, dc : Natural } -> Optional { kind : Text, value : Natural } -> Components -> List Group -> Procedure =
      λ(name : Text) ->
      λ(ability : Text) ->
      λ(spellSaveDc : Optional { kind : Text, dc : Natural }) ->
      λ(spellAttackBonus : Optional { kind : Text, value : Natural }) ->
      λ(components : Components) ->
      λ(groups : List Group) ->
        { ability = Some ability
        , ammunition = None Text
        , area = None Area
        , attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , components = Some components
        , dc = None { kind : Text, dc : Natural }
        , dispatches = None (List Dispatch)
        , groups = Some groups
        , kind = "spellcasting"
        , name = name
        , onFail = None Effect
        , onHit = None (List Effect)
        , onSuccess = None { kind : Text }
        , rangeFeet = None Range
        , reachFeet = None Natural
        , spellAttackBonus = spellAttackBonus
        , spellSaveDc = spellSaveDc
        , description = None Text
        }
let Entry : Type =
      { description : Optional Text
      , kind : Text
      , name : Optional Text
      , procedure : Optional Procedure
      , procedureOrdinal : Natural
      , reason : Optional Text
      , resourceRefs : ResourceRefs
      }
let exec : Natural -> Procedure -> Entry =
      λ(procedureOrdinal : Natural) ->
      λ(procedure : Procedure) ->
        { description = None Text
        , kind = "executable"
        , name = None Text
        , procedure = Some procedure
        , procedureOrdinal = procedureOrdinal
        , reason = None Text
        , resourceRefs = noneRefs
        }
let execSome : Natural -> Procedure -> List Natural -> Entry =
      λ(procedureOrdinal : Natural) ->
      λ(procedure : Procedure) ->
      λ(ordinals : List Natural) ->
        { description = None Text
        , kind = "executable"
        , name = None Text
        , procedure = Some procedure
        , procedureOrdinal = procedureOrdinal
        , reason = None Text
        , resourceRefs = someRefs ordinals
        }
let text : Natural -> Text -> Text -> Text -> Entry =
      λ(procedureOrdinal : Natural) ->
      λ(name : Text) ->
      λ(description : Text) ->
      λ(reason : Text) ->
        { description = Some description
        , kind = "textOnly"
        , name = Some name
        , procedure = None Procedure
        , procedureOrdinal = procedureOrdinal
        , reason = Some reason
        , resourceRefs = noneRefs
        }
let textSome : Natural -> Text -> Text -> Text -> List Natural -> Entry =
      λ(procedureOrdinal : Natural) ->
      λ(name : Text) ->
      λ(description : Text) ->
      λ(reason : Text) ->
      λ(ordinals : List Natural) ->
        { description = Some description
        , kind = "textOnly"
        , name = Some name
        , procedure = None Procedure
        , procedureOrdinal = procedureOrdinal
        , reason = Some reason
        , resourceRefs = someRefs ordinals
        }
let Trait : Type =
      { name : Text
      , description : Text
      , effect : Optional { kind : Text }
      }
let trait : Text -> Text -> Trait =
      λ(name : Text) ->
      λ(description : Text) ->
        { name = name
        , description = description
        , effect = None { kind : Text }
        }
let Speed : Type =
      { kind : Text
      , feet : { kind : Text, value : Natural }
      , hover : Optional Bool
      }
let speed : Text -> Natural -> Optional Bool -> Speed =
      λ(kind : Text) ->
      λ(feet : Natural) ->
      λ(hover : Optional Bool) ->
        { kind = kind
        , feet = { kind = "literal", value = feet }
        , hover = hover
        }
let Sense : Type =
      { kind : Text
      , rangeFeet : Natural
      , qualifier : Optional Text
      }
let sense : Text -> Natural -> Optional Text -> Sense =
      λ(kind : Text) ->
      λ(rangeFeet : Natural) ->
      λ(qualifier : Optional Text) ->
        { kind = kind, rangeFeet = rangeFeet, qualifier = qualifier }
in  { challengeRating = 9
    , id = "stat_block_cloud_giant"
    , kind = "statBlock"
    , name = "Cloud Giant"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:228-261" }
    , statBlock =
        { abilityScores = { str = 27, dex = 10, con = 22, int = 12, wis = 16, cha = 16 }
        , ac = { value = { kind = "literal", value = 14 } }
        , actions =
            [ text 1 "Multiattack" "The giant makes two attacks, using Thunderous Mace or Thundercloud in any combination. It can replace one attack with a use of Spellcasting to cast Fog Cloud." "unsupported_action_shape"
            , exec 2 (attack "Thunderous Mace" "melee" "str" 12 (Some 10) (None Range) (None Text) [ damage "bludgeoning" 3 8 8 21, damage "thunder" 2 6 0 7 ] (None Text))
            , exec 3 (attack "Thundercloud" "ranged" "str" 12 (None Natural) (Some { normal = 240, long = 240 }) (None Text) [ damage "thunder" 3 6 8 18 ] (Some "The target has the Incapacitated condition until the end of its next turn."))
            , execSome 4 (spellcasting "Spellcasting" "cha" (Some { kind = "fixed", dc = 15 }) (None { kind : Text, value : Natural }) noMaterial [ atWill [ spellRef "detect_magic" (None Natural) (None Natural) (None Text), spellRef "fog_cloud" (None Natural) (None Natural) (None Text), spellRef "light" (None Natural) (None Natural) (None Text) ], limited [ 1 ] [ spellRef "control_weather" (None Natural) (None Natural) (None Text), spellRef "gaseous_form" (None Natural) (None Natural) (None Text), spellRef "telekinesis" (None Natural) (None Natural) (None Text) ] ]) [ 1 ]
            ]
        , bonusActions =
            [ text 1 "Misty Step" "The giant casts the Misty Step spell, using the same spellcasting ability as Spellcasting." "unsupported_spellcasting_restriction"
            ]
        , alignment = { order = "neutral", morality = "neutral" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Giant" ] } }
        , creatureType = "giant"
        , hp = { kind = "literal", value = 200 }
        , initiative = { modifier = +4, score = 14 }
        , passivePerception = 21
        , savingThrowModifiers = [ { ability = "str", modifier = +8 }, { ability = "dex", modifier = +0 }, { ability = "con", modifier = +10 }, { ability = "int", modifier = +1 }, { ability = "wis", modifier = +7 }, { ability = "cha", modifier = +3 } ]
        , skillModifiers = [ { skill = "insight", modifier = 7 }, { skill = "perception", modifier = 11 } ]
        , size = "huge"
        , speeds = [ speed "walk" 40 (None Bool), speed "fly" 20 (Some True) ]
        , resources = [ resource 1 "each" (daily 1) ]
        }
    }
