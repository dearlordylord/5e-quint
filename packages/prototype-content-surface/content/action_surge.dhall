-- Action Surge — SRD 5.2.1 Fighter level 2.
-- First non-spell unit encoded in the prototype.

let actionSurge =
      { kind = "class_feature"
    , id = "fighter_action_surge"
    , name = "Action Surge"
    , className = "fighter"
    , acquiredAtLevel = 2
    , provenance =
        { kind = "srd-5.2.1"
        , section = "Classes/Fighter#Action Surge"
        }
    , description =
        "You can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action, except the Magic action. Once you use this feature, you can't do so again until you finish a Short or Long Rest."
    , mechanics =
        { family = "activation"
        , activationCost = { kind = "free" }
        , resource =
            { kind = "use_count"
            , cap = { kind = "fixed", uses = 1 }
            }
        , resetCadence = { kind = "short_or_long_rest" }
        , effect =
            { kind = "grant_extra_action"
            , restriction =
                { kind = "exclude", actions = [ "magic" ] }
            }
        }
    }

in  actionSurge
