-- Shared authoring shapes for standalone Stat Block content.
--
-- The generic effect and dice superset lives in `_types.dhall`.  This module
-- only adds the Stat Block entry, resource, and projection-shaped constructors
-- needed to keep heterogeneous procedure lists homogeneous in Dhall.  The
-- publication command's `--omit-empty` flag removes the optional sentinels.

let T = ./_types.dhall

let DiceExpr : Type = T.DiceExpr
let Amount : Type = T.DiceAmount
let Effect : Type = T.Effect
let defaultAmount : Amount = T.defaultDiceAmount
let defaultEffect : Effect = T.defaultEffect

let damage : Text -> Natural -> Natural -> Optional Integer -> Natural -> Effect =
      λ(damageType : Text) ->
      λ(dice : Natural) ->
      λ(dieSize : Natural) ->
      λ(flat : Optional Integer) ->
      λ(static : Natural) ->
        defaultEffect
        //  { amount = Some
                (defaultAmount
                 // { kind = "fixed"
                    , expr = Some { dice = dice, dieSize = dieSize, flat = flat }
                    , static = Some static
                    })
            , damageType = Some damageType
            , kind = "damage"
            }

let staticDamage : Text -> Natural -> Effect =
      λ(damageType : Text) ->
      λ(static : Natural) ->
        defaultEffect
        //  { amount = Some
                (defaultAmount
                 // { kind = "fixed"
                    , expr = None DiceExpr
                    , static = Some static
                    })
            , damageType = Some damageType
            , kind = "damage"
            }

let advantageDamage : Text -> Natural -> Natural -> Optional Integer -> Natural -> Effect =
      λ(damageType : Text) ->
      λ(dice : Natural) ->
      λ(dieSize : Natural) ->
      λ(flat : Optional Integer) ->
      λ(static : Natural) ->
        defaultEffect
        //  { amount = Some
                (defaultAmount
                 // { kind = "fixed"
                    , expr = Some { dice = dice, dieSize = dieSize, flat = flat }
                    , static = Some static
                    })
            , damageType = Some damageType
            , kind = "conditional_bonus_damage"
            , when = Some
                { kind = "attack_roll_had_advantage"
                , types = None (List Text)
                }
            }

let conditionalDamage : List Text -> Text -> Natural -> Natural -> Optional Integer -> Natural -> Effect =
      λ(types : List Text) ->
      λ(damageType : Text) ->
      λ(dice : Natural) ->
      λ(dieSize : Natural) ->
      λ(flat : Optional Integer) ->
      λ(static : Natural) ->
        defaultEffect
        //  { amount = Some
                (defaultAmount
                 // { kind = "fixed"
                    , expr = Some { dice = dice, dieSize = dieSize, flat = flat }
                    , static = Some static
                    })
            , damageType = Some damageType
            , kind = "conditional_bonus_damage"
            , when = Some
                { kind = "target_creature_type"
                , types = Some types
                }
            }

let applyCondition : Text -> Text -> Effect =
      λ(condition : Text) ->
      λ(duration : Text) ->
        defaultEffect
        //  { condition = Some condition
            , duration = Some duration
            , kind = "apply_condition"
            }

let conditionIfSize : Text -> Text -> Effect =
      λ(condition : Text) ->
      λ(maxCreatureSize : Text) ->
        defaultEffect
        //  { condition = Some condition
            , kind = "apply_condition_if_target_size_at_most"
            , maxCreatureSize = Some maxCreatureSize
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

let ResourceRefs : Type =
      { kind : Text
      , ordinals : Optional (List Natural)
      }

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

let resource : Natural -> Text -> ResourceLimit ->
      { ordinal : Natural, ownership : Text, limit : ResourceLimit } =
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
      { count : { kind : Text, value : Integer }
      , procedureOrdinal : Natural
      }

let Procedure : Type =
      { ability : Optional Text
      , ammunition : Optional Text
      , area : Optional Area
      , attackAbility : Optional Text
      , attackBonus : Optional { kind : Text, value : Integer }
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
      , options : Optional (List Text)
      , rangeFeet : Optional Range
      , reachFeet : Optional Natural
      , spellAttackBonus : Optional { kind : Text, value : Integer }
      , spellSaveDc : Optional { kind : Text, dc : Natural }
      , description : Optional Text
      }

let defaultProcedure : Procedure =
      { ability = None Text
      , ammunition = None Text
      , area = None Area
      , attackAbility = None Text
      , attackBonus = None { kind : Text, value : Integer }
      , attackType = None Text
      , components = None Components
      , dc = None { kind : Text, dc : Natural }
      , dispatches = None (List Dispatch)
      , groups = None (List Group)
      , kind = ""
      , name = ""
      , onFail = None Effect
      , onHit = None (List Effect)
      , onSuccess = None { kind : Text }
      , options = None (List Text)
      , rangeFeet = None Range
      , reachFeet = None Natural
      , spellAttackBonus = None { kind : Text, value : Integer }
      , spellSaveDc = None { kind : Text, dc : Natural }
      , description = None Text
      }

let attack : Text -> Text -> Text -> Integer -> Optional Natural -> Optional Range -> Optional Text -> List Effect -> Optional Text -> Procedure =
      λ(name : Text) ->
      λ(attackType : Text) ->
      λ(attackAbility : Text) ->
      λ(attackBonus : Integer) ->
      λ(reachFeet : Optional Natural) ->
      λ(rangeFeet : Optional Range) ->
      λ(ammunition : Optional Text) ->
      λ(onHit : List Effect) ->
      λ(description : Optional Text) ->
        defaultProcedure
        //  { ammunition = ammunition
            , attackAbility = Some attackAbility
            , attackBonus = Some { kind = "literal", value = attackBonus }
            , attackType = Some attackType
            , kind = "attack_roll"
            , name = name
            , onHit = Some onHit
            , rangeFeet = rangeFeet
            , reachFeet = reachFeet
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
        defaultProcedure
        //  { ability = Some ability
            , area = Some area
            , dc = Some { kind = "fixed", dc = dc }
            , kind = "save"
            , name = name
            , onFail = Some onFail
            , onSuccess = Some onSuccess
            , description = description
            }

let multiattack : Text -> List Dispatch -> Procedure =
      λ(name : Text) ->
      λ(dispatches : List Dispatch) ->
        defaultProcedure
        //  { dispatches = Some dispatches
            , kind = "multiattack"
            , name = name
            }

let spellcasting : Text -> Text -> Optional { kind : Text, dc : Natural } -> Optional { kind : Text, value : Integer } -> Components -> List Group -> Procedure =
      λ(name : Text) ->
      λ(ability : Text) ->
      λ(spellSaveDc : Optional { kind : Text, dc : Natural }) ->
      λ(spellAttackBonus : Optional { kind : Text, value : Integer }) ->
      λ(components : Components) ->
      λ(groups : List Group) ->
        defaultProcedure
        //  { ability = Some ability
            , components = Some components
            , groups = Some groups
            , kind = "spellcasting"
            , name = name
            , spellAttackBonus = spellAttackBonus
            , spellSaveDc = spellSaveDc
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

let defaultAction : Entry =
      { description = None Text
      , kind = ""
      , name = None Text
      , procedure = None Procedure
      , procedureOrdinal = 0
      , reason = None Text
      , resourceRefs = noneRefs
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

let typedTrait : Text -> Text -> Text -> Trait =
      λ(name : Text) ->
      λ(description : Text) ->
      λ(effectKind : Text) ->
        { name = name
        , description = description
        , effect = Some { kind = effectKind }
        }

in  { Amount
    , Components
    , Dispatch
    , Effect
    , Entry
    , Group
    , Procedure
    , Range
    , ResourceLimit
    , ResourceRefs
    , Trait
    , advancedDamage = advantageDamage
    , advantageDamage
    , attack
    , atWill
    , applyCondition
    , conditionalDamage
    , conditionIfSize
    , cone
    , daily
    , damage
    , defaultAction
    , defaultAmount
    , defaultEffect
    , defaultProcedure
    , emanation
    , exec
    , execSome
    , limited
    , line
    , multiattack
    , noComponents
    , noMaterial
    , noneRefs
    , recharge
    , resource
    , rest
    , save
    , someRefs
    , spellRef
    , spellcasting
    , staticDamage
    , text
    , textSome
    , trait
    , typedTrait
    }
