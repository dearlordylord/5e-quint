let FavoredEnemyGrant =
      { kind : Text, mode : Optional Text, spellId : Text, count : Optional Natural, resetCadence : Optional Text, scaling : Optional { axis : Text, tiers : List { atLevel : Natural, count : Natural } } }

let favoredEnemy =
      { kind = "class_feature"
      , id = "ranger_favored_enemy"
      , name = "Favored Enemy"
      , className = "ranger"
      , acquiredAtLevel = 1
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Ranger#Favored Enemy" }
      , description =
          "You always have Hunter's Mark prepared and can cast it without expending a spell slot a limited number of times per Long Rest."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_spell_access"
                , mode = Some "prepared"
                , spellId = "hunters_mark"
                , count = None Natural
                , resetCadence = None Text
                , scaling = None { axis : Text, tiers : List { atLevel : Natural, count : Natural } }
                }
              , { kind = "grant_spell_free_casts"
                , mode = None Text
                , spellId = "hunters_mark"
                , count = Some 2
                , resetCadence = Some "long_rest"
                , scaling =
                    Some
                      { axis = "class"
                      , tiers =
                          [ { atLevel = 5, count = 3 }
                          , { atLevel = 9, count = 4 }
                          , { atLevel = 13, count = 5 }
                          , { atLevel = 17, count = 6 }
                          ]
                      }
                }
              ] : List FavoredEnemyGrant
          }
      }

in  favoredEnemy
