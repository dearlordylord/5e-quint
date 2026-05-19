-- Knock - SRD 5.2.1 Spell, level 2, Transmutation.
--
-- RAW (Spells/Descriptions-E-L#Knock):
--   "Choose an object that you can see within range."
--   "The object can be ... another object that contains a mundane or
--    magical means that prevents access."
--   "A target that is held shut by a mundane lock or that is stuck or
--    barred becomes unlocked, unstuck, or unbarred. If the object has
--    multiple locks, only one of them is unlocked."
--   "If the target is held shut by Arcane Lock, that spell is suppressed
--    for 10 minutes, during which time the target can be opened and closed."
--   "When you cast the spell, a loud knock, audible up to 300 feet away,
--    emanates from the target."
--
-- Object lock/access state, Arcane Lock suppression on an object, and sound
-- propagation are table/object facts. This Spell Definition preserves the
-- authored source facts without promoting a battle-runtime object state owner.

let DurationValue : Type = { unit : Text, amount : Natural }

let DirectEffect : Type =
      { kind : Text
      , mundaneLockLimit : Optional Natural
      , duration : Optional DurationValue
      , allowsOpenClose : Optional Bool
      , sound : Optional Text
      , audibleRadiusFeet : Optional Natural
      }

let releaseObjectAccess
    : DirectEffect
    = { kind = "release_object_access"
      , mundaneLockLimit = Some 1
      , duration = None DurationValue
      , allowsOpenClose = None Bool
      , sound = None Text
      , audibleRadiusFeet = None Natural
      }

let suppressArcaneLock
    : DirectEffect
    = { kind = "suppress_arcane_lock"
      , mundaneLockLimit = None Natural
      , duration = Some { unit = "minute", amount = 10 }
      , allowsOpenClose = Some True
      , sound = None Text
      , audibleRadiusFeet = None Natural
      }

let loudKnock
    : DirectEffect
    = { kind = "audible"
      , mundaneLockLimit = None Natural
      , duration = None DurationValue
      , allowsOpenClose = None Bool
      , sound = Some "loud knock"
      , audibleRadiusFeet = Some 300
      }

let knock =
      { kind = "spell"
      , id = "knock"
      , name = "Knock"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Knock"
          }
      , description =
          "Choose an object that you can see within range. The object can be a door, a box, a chest, a set of manacles, a padlock, or another object that contains a mundane or magical means that prevents access. A target that is held shut by a mundane lock or that is stuck or barred becomes unlocked, unstuck, or unbarred. If the object has multiple locks, only one of them is unlocked. If the target is held shut by Arcane Lock, that spell is suppressed for 10 minutes, during which time the target can be opened and closed. When you cast the spell, a loud knock, audible up to 300 feet away, emanates from the target."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = False, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "knock_target_object"
                    , label = "target object"
                    , value =
                        { kind = "object"
                        , count = 1
                        , filter =
                            { accessPreventionMeans = "mundane_or_magical" }
                        }
                    }
                , effects =
                    [ releaseObjectAccess
                    , suppressArcaneLock
                    , loudKnock
                    ]
                }
              ]
          }
      }

in  knock
