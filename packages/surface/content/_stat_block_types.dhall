-- Shared authoring shapes for standalone Stat Block content.
--
-- Stat Block procedure effects are intentionally local to this authoring
-- context. They include printed flat damage modifiers and turn-owner-relative
-- condition expiration facts that are not part of the spell Effect superset.
-- The publication command's `--omit-empty` flag removes optional sentinels.

let DiceExpr : Type =
      { dice : Natural, dieSize : Natural, flat : Optional Integer }

let Amount : Type =
      { kind : Text
      , expr : Optional DiceExpr
      , static : Optional Natural
      }

let defaultAmount : Amount =
      { kind = "", expr = None DiceExpr, static = None Natural }

let ConditionExpiration : Type =
      < source_next_turn_end | target_next_turn_end >

let ConditionExpirationRecord : Type = { kind : Text }

let sourceNextTurnEnd : ConditionExpiration =
      ConditionExpiration.source_next_turn_end

let targetNextTurnEnd : ConditionExpiration =
      ConditionExpiration.target_next_turn_end

let conditionExpirationRecord :
      ConditionExpiration -> ConditionExpirationRecord =
      λ(expiration : ConditionExpiration) ->
        merge
          { source_next_turn_end = { kind = "source_next_turn_end" }
          , target_next_turn_end = { kind = "target_next_turn_end" }
          }
          expiration

let Effect : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional Amount
      , condition : Optional Text
      , expiresAt : Optional ConditionExpirationRecord
      , maxCreatureSize : Optional Text
      , when : Optional { kind : Text, types : Optional (List Text) }
      }

let defaultEffect : Effect =
      { kind = ""
      , damageType = None Text
      , amount = None Amount
      , condition = None Text
      , expiresAt = None ConditionExpirationRecord
      , maxCreatureSize = None Text
      , when = None { kind : Text, types : Optional (List Text) }
      }

let NonEmpty = λ(element : Type) -> { first : element, rest : List element }

let AtLeastTwo =
      λ(element : Type) ->
        { first : element, second : element, rest : List element }

let nonEmptyToList =
      λ(element : Type) ->
      λ(input : NonEmpty element) ->
        [ input.first ] # input.rest

let SpeedDistance : Type = { feet : Natural }

let FlySpeed : Type =
      < hovering : SpeedDistance | ordinary : SpeedDistance >

let SpeedAlternative : Type =
      < burrow : SpeedDistance
      | climb : SpeedDistance
      | fly : FlySpeed
      | swim : SpeedDistance
      | walk : SpeedDistance
      >

let SpeedAlternativeRecord : Type =
      { feet : { kind : Text, value : Natural }
      , hover : Optional Bool
      , kind : Text
      }

let ordinarySpeedAlternative =
      λ(kind : Text) ->
      λ(input : SpeedDistance) ->
        { feet = { kind = "literal", value = input.feet }
        , hover = None Bool
        , kind
        }

let speedAlternative : SpeedAlternative -> SpeedAlternativeRecord =
      λ(input : SpeedAlternative) ->
        merge
          { burrow = ordinarySpeedAlternative "burrow"
          , climb = ordinarySpeedAlternative "climb"
          , fly =
              λ(fly : FlySpeed) ->
                merge
                  { hovering =
                      λ(input : SpeedDistance) ->
                        { feet = { kind = "literal", value = input.feet }
                        , hover = Some True
                        , kind = "fly"
                        }
                  , ordinary =
                      λ(input : SpeedDistance) ->
                        { feet = { kind = "literal", value = input.feet }
                        , hover = None Bool
                        , kind = "fly"
                        }
                  }
                  fly
          , swim = ordinarySpeedAlternative "swim"
          , walk = ordinarySpeedAlternative "walk"
          }
          input

let speedAlternativesToRecords :
      AtLeastTwo SpeedAlternative -> List SpeedAlternativeRecord =
      λ(input : AtLeastTwo SpeedAlternative) ->
        [ speedAlternative input.first, speedAlternative input.second ]
        # List/fold
            SpeedAlternative
            input.rest
            (List SpeedAlternativeRecord)
            ( λ(alternative : SpeedAlternative) ->
              λ(alternatives : List SpeedAlternativeRecord) ->
                [ speedAlternative alternative ] # alternatives
            )
            ([] : List SpeedAlternativeRecord)

let SpeedEntry : Type =
      { alternatives : Optional (List SpeedAlternativeRecord)
      , feet : Optional { kind : Text, value : Natural }
      , hover : Optional Bool
      , kind : Text
      }

let speed : SpeedAlternative -> SpeedEntry =
      λ(input : SpeedAlternative) ->
        let alternative = speedAlternative input

        in  { alternatives = None (List SpeedAlternativeRecord)
            , feet = Some alternative.feet
            , hover = alternative.hover
            , kind = alternative.kind
            }

let gmSpeedChoice : AtLeastTwo SpeedAlternative -> SpeedEntry =
      λ(input : AtLeastTwo SpeedAlternative) ->
        { alternatives = Some (speedAlternativesToRecords input)
        , feet = None { kind : Text, value : Natural }
        , hover = None Bool
        , kind = "gm_choice"
        }

let Vulnerabilities : Type =
      < fixed : NonEmpty Text
      | qualified : { damageTypes : NonEmpty Text, qualifier : Text }
      >

let vulnerabilityList =
      λ(input : Vulnerabilities) ->
        merge
          { fixed =
              λ(damageTypes : NonEmpty Text) ->
                { kind = "fixed"
                , damageTypes = nonEmptyToList Text damageTypes
                , qualifier = None Text
                }
          , qualified =
              λ(qualified : { damageTypes : NonEmpty Text, qualifier : Text }) ->
                { kind = "qualified"
                , damageTypes = nonEmptyToList Text qualified.damageTypes
                , qualifier = Some qualified.qualifier
                }
          }
          input

let DamageInput : Type =
      { damageType : Text
      , dice : Natural
      , dieSize : Natural
      , flat : Optional Integer
      , static : Natural
      }

let damage : DamageInput -> Effect =
      λ(input : DamageInput) ->
        defaultEffect
        //  { amount = Some
                (defaultAmount
                 // { kind = "fixed"
                    , expr = Some { dice = input.dice, dieSize = input.dieSize, flat = input.flat }
                    , static = Some input.static
                    })
            , damageType = Some input.damageType
            , kind = "damage"
            }

let StaticDamageInput : Type = { damageType : Text, static : Natural }

let staticDamage : StaticDamageInput -> Effect =
      λ(input : StaticDamageInput) ->
        defaultEffect
        //  { amount = Some
                (defaultAmount
                 // { kind = "fixed"
                    , expr = None DiceExpr
                    , static = Some input.static
                    })
            , damageType = Some input.damageType
            , kind = "damage"
            }

let advantageDamage : DamageInput -> Effect =
      λ(input : DamageInput) ->
        defaultEffect
        //  { amount = Some
                (defaultAmount
                 // { kind = "fixed"
                    , expr = Some { dice = input.dice, dieSize = input.dieSize, flat = input.flat }
                    , static = Some input.static
                    })
            , damageType = Some input.damageType
            , kind = "conditional_bonus_damage"
            , when = Some
                { kind = "attack_roll_had_advantage"
                , types = None (List Text)
                }
            }

let applyCondition :
      { condition : Text, expiresAt : ConditionExpiration } -> Effect =
      λ(input : { condition : Text, expiresAt : ConditionExpiration }) ->
        defaultEffect
        //  { condition = Some input.condition
            , expiresAt = Some (conditionExpirationRecord input.expiresAt)
            , kind = "apply_condition"
            }

let conditionIfSize : { condition : Text, maxCreatureSize : Text } -> Effect =
      λ(input : { condition : Text, maxCreatureSize : Text }) ->
        defaultEffect
        //  { condition = Some input.condition
            , kind = "apply_condition_if_target_size_at_most"
            , maxCreatureSize = Some input.maxCreatureSize
            }

let Range : Type = { normal : Natural, long : Natural }

let Area : Type =
      { kind : Text
      , lengthFeet : Optional Natural
      , radiusFeet : Optional Natural
      , widthFeet : Optional Natural
      }

let cone : { lengthFeet : Natural } -> Area =
      λ(input : { lengthFeet : Natural }) ->
        { kind = "cone"
        , lengthFeet = Some input.lengthFeet
        , radiusFeet = None Natural
        , widthFeet = None Natural
        }

let line : { lengthFeet : Natural, widthFeet : Natural } -> Area =
      λ(input : { lengthFeet : Natural, widthFeet : Natural }) ->
        { kind = "line"
        , lengthFeet = Some input.lengthFeet
        , radiusFeet = None Natural
        , widthFeet = Some input.widthFeet
        }

let ResourceRefs : Type =
      { kind : Text
      , ordinals : Optional (List Natural)
      }

let noneRefs : ResourceRefs =
      { kind = "none", ordinals = None (List Natural) }

let someRefs : NonEmpty Natural -> ResourceRefs =
      λ(ordinals : NonEmpty Natural) ->
        { kind = "some", ordinals = Some (nonEmptyToList Natural ordinals) }

let ResourceLimit : Type =
      { kind : Text
      , minimumRoll : Optional Natural
      , rest : Optional Text
      , uses : Optional Natural
      }

let recharge : { minimumRoll : Natural } -> ResourceLimit =
      λ(input : { minimumRoll : Natural }) ->
        { kind = "recharge"
        , minimumRoll = Some input.minimumRoll
        , rest = None Text
        , uses = None Natural
        }

let daily : { uses : Natural } -> ResourceLimit =
      λ(input : { uses : Natural }) ->
        { kind = "daily"
        , minimumRoll = None Natural
        , rest = None Text
        , uses = Some input.uses
        }

let rest : ResourceLimit =
      { kind = "recharge_after_rest"
      , minimumRoll = None Natural
      , rest = Some "short_or_long"
      , uses = None Natural
      }

let Resource : Type =
      { ordinal : Natural, ownership : Text, limit : ResourceLimit }

let resource : Resource -> Resource = λ(input : Resource) -> input

let SpellRef : Type =
      { spellId : Text
      , count : Optional Natural
      , castAtLevel : Optional Natural
      , restriction : Optional Text
      }

let spellRef : SpellRef -> SpellRef = λ(reference : SpellRef) -> reference

let Group : Type =
      { kind : Text
      , resourceRefs : ResourceRefs
      , spells : List SpellRef
      }

let atWill : { spells : NonEmpty SpellRef } -> Group =
      λ(input : { spells : NonEmpty SpellRef }) ->
        { kind = "at_will"
        , resourceRefs = noneRefs
        , spells = nonEmptyToList SpellRef input.spells
        }

let LimitedSpells : Type =
      { resourceOrdinals : NonEmpty Natural, spells : NonEmpty SpellRef }

let limited : LimitedSpells -> Group =
      λ(input : LimitedSpells) ->
        { kind = "limited"
        , resourceRefs = someRefs input.resourceOrdinals
        , spells = nonEmptyToList SpellRef input.spells
        }

let Components : Type = { v : Bool, s : Bool, m : Bool }
let spellDefinitionComponents : Optional Components = None Components
let noComponents : Optional Components = Some { v = False, s = False, m = False }
let noMaterialComponents : Optional Components = Some { v = True, s = True, m = False }

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
      }

let MeleeAttack : Type =
      { name : Text
      , attackAbility : Text
      , attackBonus : Integer
      , reachFeet : Natural
      , onHit : NonEmpty Effect
      }

let meleeAttack : MeleeAttack -> Procedure =
      λ(input : MeleeAttack) ->
        defaultProcedure
        //  { attackAbility = Some input.attackAbility
            , attackBonus = Some { kind = "literal", value = input.attackBonus }
            , attackType = Some "melee"
            , kind = "attack_roll"
            , name = input.name
            , onHit = Some (nonEmptyToList Effect input.onHit)
            , reachFeet = Some input.reachFeet
            }

let RangedAttack : Type =
      { name : Text
      , attackAbility : Text
      , attackBonus : Integer
      , rangeFeet : Range
      , ammunition : Optional Text
      , onHit : NonEmpty Effect
      }

let rangedAttack : RangedAttack -> Procedure =
      λ(input : RangedAttack) ->
        defaultProcedure
        //  { ammunition = input.ammunition
            , attackAbility = Some input.attackAbility
            , attackBonus = Some { kind = "literal", value = input.attackBonus }
            , attackType = Some "ranged"
            , kind = "attack_roll"
            , name = input.name
            , onHit = Some (nonEmptyToList Effect input.onHit)
            , rangeFeet = Some input.rangeFeet
            }

let SaveArea : Type =
      { name : Text
      , ability : Text
      , dc : Natural
      , area : Area
      , onFail : Effect
      , onSuccess : { kind : Text }
      }

let saveArea : SaveArea -> Procedure =
      λ(input : SaveArea) ->
        defaultProcedure
        //  { ability = Some input.ability
            , area = Some input.area
            , dc = Some { kind = "fixed", dc = input.dc }
            , kind = "save"
            , name = input.name
            , onFail = Some input.onFail
            , onSuccess = Some input.onSuccess
            }

let Multiattack : Type = { name : Text, dispatches : NonEmpty Dispatch }

let multiattack : Multiattack -> Procedure =
      λ(input : Multiattack) ->
        defaultProcedure
        //  { dispatches = Some (nonEmptyToList Dispatch input.dispatches)
            , kind = "multiattack"
            , name = input.name
            }

let ActionOption : Type = { name : Text, options : NonEmpty Text }

let actionOption : ActionOption -> Procedure =
      λ(input : ActionOption) ->
        defaultProcedure
        //  { kind = "action_option"
            , name = input.name
            , options = Some (nonEmptyToList Text input.options)
            }

let Spellcasting : Type =
      { name : Text
      , ability : Text
      , spellSaveDc : Optional { kind : Text, dc : Natural }
      , spellAttackBonus : Optional { kind : Text, value : Integer }
      , components : Optional Components
      , groups : NonEmpty Group
      }

let spellcasting : Spellcasting -> Procedure =
      λ(input : Spellcasting) ->
        defaultProcedure
        //  { ability = Some input.ability
            , components = input.components
            , groups = Some (nonEmptyToList Group input.groups)
            , kind = "spellcasting"
            , name = input.name
            , spellAttackBonus = input.spellAttackBonus
            , spellSaveDc = input.spellSaveDc
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

let Executable : Type =
      { procedureOrdinal : Natural, procedure : Procedure }

let executable : Executable -> Entry =
      λ(input : Executable) ->
        { description = None Text
        , kind = "executable"
        , name = None Text
        , procedure = Some input.procedure
        , procedureOrdinal = input.procedureOrdinal
        , reason = None Text
        , resourceRefs = noneRefs
        }

let NonSpellProcedure : Type =
      < actionOption : ActionOption
      | meleeAttack : MeleeAttack
      | multiattack : Multiattack
      | rangedAttack : RangedAttack
      | saveArea : SaveArea
      >

let nonSpellProcedure : NonSpellProcedure -> Procedure =
      λ(procedure : NonSpellProcedure) ->
        merge
          { actionOption
          , meleeAttack
          , multiattack
          , rangedAttack
          , saveArea
          }
          procedure

let ResourceExecutable : Type =
      { procedureOrdinal : Natural
      , procedure : NonSpellProcedure
      , resourceOrdinals : NonEmpty Natural
      }

let resourceExecutable : ResourceExecutable -> Entry =
      λ(input : ResourceExecutable) ->
        { description = None Text
        , kind = "executable"
        , name = None Text
        , procedure = Some (nonSpellProcedure input.procedure)
        , procedureOrdinal = input.procedureOrdinal
        , reason = None Text
        , resourceRefs = someRefs input.resourceOrdinals
        }

let TextOnly : Type =
      { procedureOrdinal : Natural
      , name : Text
      , description : Text
      , reason : Text
      }

let textOnly : TextOnly -> Entry =
      λ(input : TextOnly) ->
        { description = Some input.description
        , kind = "textOnly"
        , name = Some input.name
        , procedure = None Procedure
        , procedureOrdinal = input.procedureOrdinal
        , reason = Some input.reason
        , resourceRefs = noneRefs
        }

let ResourceTextOnly : Type =
      { procedureOrdinal : Natural
      , name : Text
      , description : Text
      , reason : Text
      , resourceOrdinals : NonEmpty Natural
      }

let resourceTextOnly : ResourceTextOnly -> Entry =
      λ(input : ResourceTextOnly) ->
        { description = Some input.description
        , kind = "textOnly"
        , name = Some input.name
        , procedure = None Procedure
        , procedureOrdinal = input.procedureOrdinal
        , reason = Some input.reason
        , resourceRefs = someRefs input.resourceOrdinals
        }

let Trait : Type =
      { name : Text
      , description : Text
      , effect : Optional { kind : Text }
      }

let TraitInput : Type =
      { name : Text, description : Text, effectKind : Optional Text }

let trait : TraitInput -> Trait =
      λ(input : TraitInput) ->
        { name = input.name
        , description = input.description
        , effect =
            merge
              { None = None { kind : Text }
              , Some = λ(effectKind : Text) -> Some { kind = effectKind }
              }
              input.effectKind
        }

in  { Effect
    , Dispatch
    , FlySpeed
    , SpeedAlternative
    , SpellRef
    , Group
    , Vulnerabilities
    , advantageDamage
    , actionOption
    , meleeAttack
    , rangedAttack
    , atWill
    , applyCondition
    , conditionIfSize
    , cone
    , daily
    , damage
    , executable
    , NonSpellProcedure
    , resourceExecutable
    , limited
    , line
    , multiattack
    , noComponents
    , noMaterialComponents
    , recharge
    , resource
    , rest
    , saveArea
    , spellRef
    , spellDefinitionComponents
     , spellcasting
     , speed
     , gmSpeedChoice
    , staticDamage
    , sourceNextTurnEnd
    , targetNextTurnEnd
    , textOnly
    , resourceTextOnly
    , trait
    , vulnerabilityList
    }
