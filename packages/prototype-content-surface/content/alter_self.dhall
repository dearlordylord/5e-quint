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
--   • Change Appearance: purely narrative / DM-owned (no stats change).
--     Encoded with effects = None (List EffectAtom) per type comment:
--     "Options may omit effects when the branch is purely caller-/DM-owned
--     narrative with no mechanical payload."
--
--   • Natural Weapons: natural_weapons { damageType, damageDie = 6 }.
--     SURFACE WIDENING: natural_weapons.damageType is DamageType (fixed),
--     but the SRD requires a cast-time sub-choice: claws=Slashing,
--     fangs/horns=Piercing, hooves=Bludgeoning.
--     natural_weapons.damageType needs widening to DamageTypeRef
--     (= DamageType | CastTimeChoice<DamageType>).
--     Placeholder uses "slashing" as the representative damage type.

-- Dhall super-type covering all EffectAtom variants used in this spell.
-- dhall-to-json --omit-empty drops None fields so each JSON object only
-- carries the discriminant fields relevant to its kind.
let EffectAtom : Type =
      { kind : Text
      , speedKind : Optional Text
      , feet : Optional { kind : Text }
      , damageType : Optional Text
      , damageDie : Optional Natural
      }

let ModeOption : Type =
      { id : Text, displayName : Text, effects : Optional (List EffectAtom) }

let waterBreathing : EffectAtom =
      { kind = "water_breathing"
      , speedKind = None Text
      , feet = None { kind : Text }
      , damageType = None Text
      , damageDie = None Natural
      }

let grantSwimSpeed : EffectAtom =
      { kind = "grant_speed"
      , speedKind = Some "swim"
      , feet = Some { kind = "walk_speed" }
      , damageType = None Text
      , damageDie = None Natural
      }

let naturalWeapons : EffectAtom =
      { kind = "natural_weapons"
      , speedKind = None Text
      , feet = None { kind : Text }
      , damageType = Some "slashing"
      , damageDie = Some 6
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
