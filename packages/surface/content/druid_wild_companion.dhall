-- Wild Companion - SRD 5.2.1 Druid level 2.
-- Magic Action: expend a spell slot or one Wild Shape use to cast Find
-- Familiar without Material components. The feature fixes the familiar's
-- creature type to Fey and adds the Long Rest disappearance boundary.
-- Familiar lifecycle execution remains owned by the Find Familiar spell Unit.

let SpendOption = { kind : Text, resourceUnitId : Optional Text }

let wildCompanion =
      { kind = "class_feature"
      , id = "druid_wild_companion"
      , name = "Wild Companion"
      , className = "druid"
      , acquiredAtLevel = 2
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Druid.md:124-128" }
      , description =
          "As a Magic action, expend a spell slot or one Wild Shape use to cast Find Familiar without Material components. The familiar is Fey and disappears when you finish a Long Rest."
      , mechanics =
          { family = "druid_wild_companion_spell_cast"
          , activationCost = { kind = "standard_action", action = "magic" }
          , spellId = "find_familiar"
          , spendOptions =
              [ { kind = "spell_slot", resourceUnitId = None Text }
              , { kind = "one_class_feature_use"
                , resourceUnitId = Some "druid_wild_shape"
                }
              ] : List SpendOption
          , componentOverride = { material = "not_required" }
          , spellModeOverride =
              { kind = "fixed_creature_type_mode_option", optionId = "fey" }
          , familiarDismissal = { kind = "caster_finishes_long_rest" }
          }
      }

in  wildCompanion
