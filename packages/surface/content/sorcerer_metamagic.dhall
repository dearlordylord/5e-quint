-- Metamagic - SRD 5.2.1 Sorcerer level 2.
--
-- Metamagic grants a build-time choice of spell-modifying options. Each
-- selected option spends Sorcery Points from Font of Magic when it modifies a
-- spell. This record is catalog/source-fact authoring; CharacterBuild option
-- projection and cast-time execution are later owner tasks.

let ChoiceLevel = { atLevel : Natural, total : Natural }

let MetamagicOption =
      { id : Text
      , displayName : Text
      , sorceryPointCost : Natural
      , stackingMode : Text
      , effectKind : Text
      }

let metamagic =
      { acquiredAtLevel = 2
      , className = "sorcerer"
      , description =
          "SRD Sorcerer level 2 Metamagic option-grant source facts. A Sorcerer chooses two Metamagic options at level 2, can replace one known option with an unknown option whenever they gain a Sorcerer level, gains two more choices at Sorcerer levels 10 and 17, and spends the Sorcery Point cost of a known option from the shared Font of Magic Sorcery Point pool when modifying a spell."
      , id = "sorcerer_metamagic"
      , kind = "class_feature"
      , mechanics =
          { family = "metamagic_options"
          , choiceKey = "sorcerer_metamagic_options"
          , timing = "class_feature_acquisition"
          , choiceCount =
              { kind = "class_level_total_choices"
              , levels =
                [ { atLevel = 2, total = 2 }
                , { atLevel = 10, total = 4 }
                , { atLevel = 17, total = 6 }
                ] : List ChoiceLevel
              }
          , changeOn =
              { kind = "class_level"
              , count = 1
              , replacement = "one_known_option_with_one_unknown_option"
              }
          , selectionRepeatability = { kind = "unique" }
          , spends =
              { kind = "class_feature_point_pool"
              , resourceUnitId = "sorcerer_font_of_magic"
              }
          , spellUseLimit =
              { kind = "one_per_spell_unless_option_allows_stacking" }
          , options =
            [ { id = "sorcerer_careful_spell"
              , displayName = "Careful Spell"
              , sorceryPointCost = 1
              , stackingMode = "one_per_spell"
              , effectKind = "saving_throw_protection"
              }
            , { id = "sorcerer_distant_spell"
              , displayName = "Distant Spell"
              , sorceryPointCost = 1
              , stackingMode = "one_per_spell"
              , effectKind = "spell_range_increase"
              }
            , { id = "sorcerer_empowered_spell"
              , displayName = "Empowered Spell"
              , sorceryPointCost = 1
              , stackingMode = "can_combine_with_different_metamagic"
              , effectKind = "damage_dice_reroll"
              }
            , { id = "sorcerer_extended_spell"
              , displayName = "Extended Spell"
              , sorceryPointCost = 1
              , stackingMode = "one_per_spell"
              , effectKind = "duration_extension_and_concentration_save_advantage"
              }
            , { id = "sorcerer_heightened_spell"
              , displayName = "Heightened Spell"
              , sorceryPointCost = 2
              , stackingMode = "one_per_spell"
              , effectKind = "saving_throw_disadvantage"
              }
            , { id = "sorcerer_quickened_spell"
              , displayName = "Quickened Spell"
              , sorceryPointCost = 2
              , stackingMode = "one_per_spell"
              , effectKind =
                  "action_casting_time_to_bonus_action_with_spell_turn_limit"
              }
            , { id = "sorcerer_seeking_spell"
              , displayName = "Seeking Spell"
              , sorceryPointCost = 1
              , stackingMode = "can_combine_with_different_metamagic"
              , effectKind = "missed_spell_attack_reroll"
              }
            , { id = "sorcerer_subtle_spell"
              , displayName = "Subtle Spell"
              , sorceryPointCost = 1
              , stackingMode = "one_per_spell"
              , effectKind = "component_suppression"
              }
            , { id = "sorcerer_transmuted_spell"
              , displayName = "Transmuted Spell"
              , sorceryPointCost = 1
              , stackingMode = "one_per_spell"
              , effectKind = "damage_type_substitution"
              }
            , { id = "sorcerer_twinned_spell"
              , displayName = "Twinned Spell"
              , sorceryPointCost = 1
              , stackingMode = "one_per_spell"
              , effectKind = "effective_spell_level_increase_for_extra_target"
              }
            ] : List MetamagicOption
          }
      , name = "Metamagic"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Sorcerer.md:33-54,111-117,145-214"
          }
      }

in  metamagic
