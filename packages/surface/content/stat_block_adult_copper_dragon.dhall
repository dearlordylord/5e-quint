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
in  { challengeRating = 14
    , id = "stat_block_adult_copper_dragon"
    , kind = "statBlock"
    , name = "Adult Copper Dragon"
    , provenance = { kind = "srd-5.2.1", section = "Monsters/Monsters-C-D.md:379-425" }
    , statBlock =
        { abilityScores = { str = 23, dex = 12, con = 21, int = 18, wis = 15, cha = 18 }
        , ac = { value = { kind = "literal", value = 18 } }
        , actions =
            [ text 1 "Multiattack" "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Slowing Breath or (B) Spellcasting to cast Mind Spike (level 4 version)." "unsupported_action_shape"
            , exec 2 (attack "Rend" "melee" "str" 11 (Some 10) (None Range) (None Text) [ damage "slashing" 2 10 6 17, damage "acid" 1 8 0 4 ] (None Text))
            , execSome 3 (save "Acid Breath" "dex" 18 (line 60 5) (damage "acid" 12 8 0 54) { kind = "half_damage" } (None Text)) [ 1 ]
            , text 4 "Slowing Breath" "Constitution Saving Throw: DC 18, each creature in a 60-foot Cone. Failure: The target can't take Reactions; its Speed is halved; and it can take either an action or a Bonus Action on its turn, not both. This effect lasts until the end of its next turn." "unsupported_action_shape"
            , execSome 5 (spellcasting "Spellcasting" "cha" (Some { kind = "fixed", dc = 17 }) (None { kind : Text, value : Natural }) noMaterial [ atWill [ spellRef "detect_magic" (None Natural) (None Natural) (None Text), spellRef "mind_spike" (None Natural) (Some 4) (None Text), spellRef "minor_illusion" (None Natural) (None Natural) (None Text), spellRef "shapechange" (None Natural) (None Natural) (Some "Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell") ], limited [ 2 ] [ spellRef "greater_restoration" (None Natural) (None Natural) (None Text), spellRef "major_image" (None Natural) (None Natural) (None Text) ] ]) [ 2 ]
            ]
        , legendaryActions = { uses = 3, entries = [ text 1 "Giggling Magic" "Charisma Saving Throw: DC 17, one creature the dragon can see within 90 feet. Failure: 24 (7d6) Psychic damage. Until the end of its next turn, the target rolls 1d6 whenever it makes an ability check or attack roll and subtracts the number rolled from the D20 Test. Failure or Success: The dragon can't take this action again until the start of its next turn." "unsupported_action_shape", text 2 "Mind Jolt" "The dragon uses Spellcasting to cast Mind Spike (level 4 version). The dragon can't take this action again until the start of its next turn." "unsupported_action_shape", text 3 "Pounce" "The dragon moves up to half its Speed, and it makes one Rend attack." "unsupported_action_shape" ] }
        , traits = [ trait "Legendary Resistance (3/Day, or 4/Day in Lair)" "If the dragon fails a saving throw, it can choose to succeed instead." ]
        , alignment = { order = "chaotic", morality = "good" }
        , communication = { kind = "spoken_and_understood", languages = { kind = "named", languages = [ "Common", "Draconic" ] } }
        , creatureType = "dragon"
        , creatureTypeTags = [ "metallic" ]
        , hp = { kind = "literal", value = 184 }
        , initiative = { modifier = +11, score = 21 }
        , passivePerception = 22
        , savingThrowModifiers = [ { ability = "str", modifier = +6 }, { ability = "dex", modifier = +6 }, { ability = "con", modifier = +5 }, { ability = "int", modifier = +4 }, { ability = "wis", modifier = +7 }, { ability = "cha", modifier = +4 } ]
        , immunities = { conditions = None (List Text), damageTypes = Some [ "acid" ] }
        , senses = [ sense "blindsight" 60 (None Text), sense "darkvision" 120 (None Text) ]
        , skillModifiers = [ { skill = "deception", modifier = 9 }, { skill = "perception", modifier = 12 }, { skill = "stealth", modifier = 6 } ]
        , size = "huge"
        , speeds = [ speed "walk" 40 (None Bool), speed "climb" 40 (None Bool), speed "fly" 80 (None Bool) ]
        , resources = [ resource 1 "shared" (recharge 5), resource 2 "each" (daily 1) ]
        }
    }
