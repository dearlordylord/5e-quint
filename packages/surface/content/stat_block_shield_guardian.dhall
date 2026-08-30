{ challengeRating = 7
, id = "stat_block_shield_guardian"
, kind = "statBlock"
, name = "Shield Guardian"
, provenance =
  { kind = "srd-5.2.1", section = "Monsters/Monsters-P-S.md:953-986" }
, statBlock =
  { abilityScores = { cha = 3, con = 18, dex = 8, int = 7, str = 18, wis = 10 }
  , ac.value = { kind = "literal", value = 17 }
  , actions =
    [ { kind = "executable"
      , procedure =
        { attackAbility = None Text
        , attackBonus = None { kind : Text, value : Natural }
        , attackType = None Text
        , dispatches = Some
          [ { count = { kind = "literal", value = 2 }, procedureOrdinal = 2 } ]
        , kind = "multiattack"
        , name = "Multiattack"
        , onHit =
            None
              ( List
                  { amount :
                      { expr :
                          { dice : Natural
                          , dieSize : Natural
                          , flat : Optional Natural
                          }
                      , kind : Text
                      , static : Natural
                      }
                  , damageType : Text
                  , kind : Text
                  }
              )
        , reachFeet = None Natural
        }
      , procedureOrdinal = 1
      , resourceRefs.kind = "none"
      }
    , { kind = "executable"
      , procedure =
        { attackAbility = Some "str"
        , attackBonus = Some { kind = "literal", value = 7 }
        , attackType = Some "melee"
        , dispatches =
            None
              ( List
                  { count : { kind : Text, value : Natural }
                  , procedureOrdinal : Natural
                  }
              )
        , kind = "attack_roll"
        , name = "Fist"
        , onHit = Some
          [ { amount =
              { expr = { dice = 2, dieSize = 6, flat = Some 4 }
              , kind = "fixed"
              , static = 11
              }
            , damageType = "bludgeoning"
            , kind = "damage"
            }
          , { amount =
              { expr = { dice = 2, dieSize = 6, flat = None Natural }
              , kind = "fixed"
              , static = 7
              }
            , damageType = "force"
            , kind = "damage"
            }
          ]
        , reachFeet = Some 10
        }
      , procedureOrdinal = 2
      , resourceRefs.kind = "none"
      }
    ]
  , alignment = "unaligned"
  , communication =
    { kind = "understood_but_cannot_speak"
    , languages =
      { kind = "named", languages = [ "commands given in any language" ] }
    }
  , creatureType = "construct"
  , hp = { kind = "literal", value = 142 }
  , immunities =
    { conditions =
      [ "charmed"
      , "exhaustion"
      , "frightened"
      , "paralyzed"
      , "petrified"
      , "poisoned"
      ]
    , damageTypes = [ "poison" ]
    }
  , initiative = { modifier = -1, score = 9 }
  , passivePerception = 10
  , reactions =
    [ { description =
          "Trigger: An attack roll hits the wearer of the guardian's amulet while the wearer is within 5 feet of the guardian. Response: The wearer gains a +5 bonus to AC, including against the triggering attack and possibly causing it to miss, until the start of the guardian's next turn."
      , kind = "textOnly"
      , name = "Protection"
      , procedureOrdinal = 1
      , reason = "unsupported_procedure_family"
      , resourceRefs.kind = "none"
      }
    ]
  , savingThrowModifiers =
    [ { ability = "cha", modifier = -4 }
    , { ability = "con", modifier = +4 }
    , { ability = "dex", modifier = -1 }
    , { ability = "int", modifier = -2 }
    , { ability = "str", modifier = +4 }
    , { ability = "wis", modifier = +0 }
    ]
  , senses =
    [ { kind = "blindsight", rangeFeet = 10 }
    , { kind = "darkvision", rangeFeet = 60 }
    ]
  , size = "large"
  , speeds = [ { feet = { kind = "literal", value = 30 }, kind = "walk" } ]
  , traits =
    [ { description =
          "The guardian is magically bound to an amulet. While the guardian and its amulet are on the same plane of existence, the amulet's wearer can telepathically call the guardian to travel to it, and the guardian knows the distance and direction to the amulet. If the guardian is within 60 feet of the amulet's wearer, half of any damage the wearer takes (round up) is transferred to the guardian."
      , name = "Bound"
      }
    , { description =
          "The guardian regains 10 Hit Points at the start of each of its turns if it has at least 1 Hit Point."
      , name = "Regeneration"
      }
    , { description =
          "A spellcaster who wears the guardian's amulet can cause the guardian to store one spell of level 4 or lower. To do so, the wearer must cast the spell on the guardian while within 5 feet of it. The spell has no effect but is stored within the guardian. Any previously stored spell is lost when a new spell is stored. The guardian can cast the spell stored with any parameters set by the original caster, requiring no spell components and using the caster's spellcasting ability. The stored spell is then lost."
      , name = "Spell Storing"
      }
    ]
  }
}
