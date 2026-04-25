-- Acid Splash — SRD 5.2.1 Spell, level 0 (cantrip), Evocation.
-- Family: activation (single save_gate phase).
-- Area: 5-foot-radius Sphere centered on a point within 60 ft.
-- Each creature in the Sphere: Dex save or take acid damage.
-- Cantrip upgrade: 1d6 → 2d6 (L5) → 3d6 (L11) → 4d6 (L17).

let acidSplash =
      { kind = "spell"
      , id = "acid_splash"
      , name = "Acid Splash"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Acid Splash"
          }
      , description =
          "You create an acidic bubble at a point within range, where it explodes in a 5-foot-radius Sphere. Each creature in that Sphere must succeed on a Dexterity saving throw or take 1d6 Acid damage. Cantrip Upgrade: The damage increases by 1d6 when you reach levels 5 (2d6), 11 (3d6), and 17 (4d6)."
      , mechanics =
          { family = "activation"
          , level = 0
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "acid_splash_point"
                    , label = "spell origin point"
                    , value =
                        { kind = "area"
                        , shape = { kind = "sphere", radiusFeet = 5 }
                        , origin = { kind = "point_within_range" }
                        }
                    }
                , ability = "dex"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "damage"
                    , damageType = "acid"
                    , amount =
                        { kind = "threshold_tiers"
                        , axis = "character"
                        , base = { dice = 1, dieSize = 6 }
                        , tiers =
                            [ { atLevel = 5, override = { dice = 2 } }
                            , { atLevel = 11, override = { dice = 3 } }
                            , { atLevel = 17, override = { dice = 4 } }
                            ]
                        }
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  acidSplash
