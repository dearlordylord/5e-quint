let eldritchInvocations =
      { kind = "class_feature"
      , id = "warlock_eldritch_invocations"
      , name = "Eldritch Invocations"
      , className = "warlock"
      , acquiredAtLevel = 1
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Warlock#Eldritch Invocations"
          }
      , description =
          "You gain Eldritch Invocations of your choice, meeting prerequisites, replacing eligible invocations when you gain a Warlock level, and not choosing the same invocation twice unless its description allows it."
      , mechanics =
          { family = "feature_choice"
          , choiceKey = "eldritch_invocations"
          , timing = "class_feature_acquisition"
          , choiceCount =
              { kind = "class_level_total_choices"
              , levels =
                  [ { atLevel = 1, total = 1 }
                  , { atLevel = 2, total = 3 }
                  , { atLevel = 5, total = 5 }
                  , { atLevel = 7, total = 6 }
                  , { atLevel = 9, total = 7 }
                  , { atLevel = 12, total = 8 }
                  , { atLevel = 15, total = 9 }
                  , { atLevel = 18, total = 10 }
                  ]
              }
          , optionSource =
              { kind = "class_feature_options"
              , className = "warlock"
              , optionKind = "eldritch_invocation"
              }
          , changeOn = { kind = "class_level", count = 1 }
          , constraints =
              { prerequisitesRequired = True
              , selectionRepeatability =
                  { kind = "per_option"
                  , default = "once"
                  , repeatableWhen =
                      { kind = "option_description_repeatable_clause" }
                  }
              , prerequisiteForKnownOptionLocksReplacement = True
              }
          }
      }

in  eldritchInvocations
