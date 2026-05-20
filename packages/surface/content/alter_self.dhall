-- Alter Self — SRD 5.2.1 Spell, level 2, Transmutation.
--
-- RAW (Spells / Descriptions A-D / Alter Self):
--   "You alter your physical form. Choose one of the following options.
--    Its effects last for the duration, during which you can take a
--    Magic action to replace the option you chose with a different one."
--
--   Aquatic Adaptation: "You sprout gills and grow webs between your fingers.
--    You can breathe underwater and gain a Swim Speed equal to your Speed."
--
--   Change Appearance: "You alter your appearance. You decide what you look
--    like... none of your statistics change."
--
--   Natural Weapons: "You grow claws (Slashing), fangs (Piercing), horns
--    (Piercing), or hooves (Bludgeoning). When you use your Unarmed Strike
--    to deal damage with that new growth, it deals 1d6 damage of the type
--    in parentheses instead of dealing the normal damage for your Unarmed
--    Strike, and you use your spellcasting ability modifier for the attack
--    and damage rolls rather than using Strength."
--
-- ENCODING NOTES:
--
--   • Family: activation — single direct phase with CastTimeEffectModeChoice.
--     The three options map cleanly to mode.options. The mid-duration switch
--     ("take a Magic action to replace the option") encodes as
--     allowsMidDurationSwitchAs = "magic_action".
--
--   • Aquatic Adaptation: water_breathing + grant_speed { speedKind = swim,
--     feet = { kind = "walk_speed" } (LinkedSpeed §A14) }.
--
--   • Change Appearance: presentation / DM-owned (no stats change).
--     Encoded with effects = None (List EffectAtom) per type comment:
--     "Options may omit effects when the branch is purely caller-/DM-owned
--     narrative with no mechanical payload."
--
--   • Natural Weapons: natural_weapons keeps the growth choice and its
--     mapped damage type together in one choice table:
--       claws=Slashing, fangs=Piercing, horns=Piercing, hooves=Bludgeoning.
--     The atom also records the fixed 1d6 die and the spellcasting-ability
--     replacement for attack and damage rolls.

-- Dhall super-type covering all EffectAtom variants used in this spell.
-- dhall-to-json --omit-empty drops None fields so each JSON object only
-- carries the discriminant fields relevant to its kind.
let DamageTypeOption : Type =
      { id : Text, displayName : Text, damageType : Text }

let DamageTypeRef : Type =
      { kind : Text
      , holeId : Text
      , label : Text
      , options : List DamageTypeOption
      }

let EffectAtom : Type =
      { kind : Text
      , speedKind : Optional Text
      , feet : Optional { kind : Text }
      , damageType : Optional DamageTypeRef
      , damageDie : Optional Natural
      , replacesAbility : Optional Text
      , attackRollAbility : Optional Text
      , damageRollAbility : Optional Text
      }

let ModeOption : Type =
      { id : Text, displayName : Text, effects : Optional (List EffectAtom) }

let waterBreathing : EffectAtom =
      { kind = "water_breathing"
      , speedKind = None Text
      , feet = None { kind : Text }
      , damageType = None DamageTypeRef
      , damageDie = None Natural
      , replacesAbility = None Text
      , attackRollAbility = None Text
      , damageRollAbility = None Text
      }

let grantSwimSpeed : EffectAtom =
      { kind = "grant_speed"
      , speedKind = Some "swim"
      , feet = Some { kind = "walk_speed" }
      , damageType = None DamageTypeRef
      , damageDie = None Natural
      , replacesAbility = None Text
      , attackRollAbility = None Text
      , damageRollAbility = None Text
      }

let naturalWeaponGrowthDamageType : DamageTypeRef =
      { kind = "choice_table"
      , holeId = "alter_self_natural_weapon_growth"
      , label = "natural weapon growth"
      , options =
          [ { id = "claws", displayName = "claws", damageType = "slashing" }
          , { id = "fangs", displayName = "fangs", damageType = "piercing" }
          , { id = "horns", displayName = "horns", damageType = "piercing" }
          , { id = "hooves", displayName = "hooves", damageType = "bludgeoning" }
          ]
      }

let naturalWeapons : EffectAtom =
      { kind = "natural_weapons"
      , speedKind = None Text
      , feet = None { kind : Text }
      , damageType = Some naturalWeaponGrowthDamageType
      , damageDie = Some 6
      , replacesAbility = Some "str"
      , attackRollAbility = Some "spellcasting"
      , damageRollAbility = Some "spellcasting"
      }

let alterSelf =
      { kind = "spell"
      , id = "alter_self"
      , name = "Alter Self"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Alter Self"
          }
      , description =
          "You alter your physical form. Choose one of the following options. Its effects last for the duration, during which you can take a Magic action to replace the option you chose with a different one. Aquatic Adaptation: You sprout gills and grow webs between your fingers. You can breathe underwater and gain a Swim Speed equal to your Speed. Change Appearance: You alter your appearance. You decide what you look like, including your height, weight, facial features, sound of your voice, hair length, coloration, and other distinguishing characteristics. You can make yourself appear as a member of another species, though none of your statistics change. You can't appear as a creature of a different size, and your basic shape stays the same. Natural Weapons: You grow claws (Slashing), fangs (Piercing), horns (Piercing), or hooves (Bludgeoning). When you use your Unarmed Strike to deal damage with that new growth, it deals 1d6 damage of the type in parentheses instead of dealing the normal damage for your Unarmed Strike, and you use your spellcasting ability modifier for the attack and damage rolls rather than using Strength."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "hour", amount = 1 }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , mode =
                    { label = "Choose an alteration"
                    , allowsMidDurationSwitchAs = Some "magic_action"
                    , options =
                        [ { id = "aquatic_adaptation"
                          , displayName = "Aquatic Adaptation"
                          , effects =
                              Some [ waterBreathing, grantSwimSpeed ]
                          }
                        , { id = "change_appearance"
                          , displayName = "Change Appearance"
                          , effects = None (List EffectAtom)
                          }
                        , { id = "natural_weapons"
                          , displayName = "Natural Weapons"
                          , effects = Some [ naturalWeapons ]
                          }
                        ]
                    }
                }
              ]
          }
      }

in  alterSelf
