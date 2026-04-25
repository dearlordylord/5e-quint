-- Sacred Flame — SRD 5.2.1 Cantrip, Evocation.
--
-- RAW (Spells / Descriptions S-Z / Sacred Flame):
--   "Flame-like radiance descends on a creature that you can see
--    within range. The target must succeed on a Dexterity saving
--    throw or take 1d8 Radiant damage. The target gains no benefit
--    from Half Cover or Three-Quarters Cover for this save."
--   "Cantrip Upgrade. The damage increases by 1d8 when you reach
--    levels 5 (2d8), 11 (3d8), and 17 (4d8)."
--
-- ZERO-WIDENING VALIDATION REFERENCE. Standard cantrip save_gate
-- with threshold_tiers damage. The cover-immunity clause is DM
-- agenda (cover is spatial, per ARCHITECTURE.md §1 — session
-- resolves whether cover applies).

let sacredFlame =
      { kind = "spell"
      , id = "sacred_flame"
      , name = "Sacred Flame"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Sacred Flame"
          }
      , description =
          "Flame-like radiance descends on a creature that you can see within range. The target must succeed on a Dexterity saving throw or take 1d8 Radiant damage. The target gains no benefit from Half Cover or Three-Quarters Cover for this save. Cantrip Upgrade: The damage increases by 1d8 when you reach levels 5 (2d8), 11 (3d8), and 17 (4d8)."
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
                    , holeId = "sacred_flame_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , ability = "dex"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "damage"
                    , damageType = "radiant"
                    , amount =
                        { kind = "threshold_tiers"
                        , axis = "character"
                        , base = { dice = 1, dieSize = 8 }
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

in  sacredFlame
