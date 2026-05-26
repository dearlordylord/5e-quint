-- Second-Story Work — SRD 5.2.1 Rogue level 3.

let LinkedSpeed : Type = { kind : Text }

let Grant : Type =
      { kind : Text
      , delta : Optional Natural
      , unit : Optional Text
      , speedKind : Optional Text
      , feet : Optional LinkedSpeed
      , use : Optional Text
      , replaces : Optional Text
      }

let secondStoryWork =
      { kind = "class_feature"
      , id = "rogue_second_story_work"
      , name = "Second-Story Work"
      , className = "rogue"
      , acquiredAtLevel = 3
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Rogue#Second-Story Work"
          }
      , description =
          "You have a Climb Speed equal to your Speed. In addition, you can use Dexterity instead of Strength to determine the distance you jump."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_speed"
                , delta = None Natural
                , unit = None Text
                , speedKind = Some "climb"
                , feet = Some { kind = "walk_speed" }
                , use = None Text
                , replaces = None Text
                }
              , { kind = "offer_ability_substitution_for_jump_distance"
                , delta = None Natural
                , unit = None Text
                , speedKind = None Text
                , feet = None LinkedSpeed
                , use = Some "dex"
                , replaces = Some "str"
                }
              ] : List Grant
          }
      }

in  secondStoryWork
