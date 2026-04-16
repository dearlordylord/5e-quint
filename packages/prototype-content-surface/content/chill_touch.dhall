-- Chill Touch — SRD 5.2.1 Cantrip, Necromancy.
-- Family: activation (single attack_roll phase).
-- Melee spell attack; on hit: 1d10 Necrotic damage (cantrip scaling).
-- OMITTED RIDER: "can't regain Hit Points until end of your next turn"
-- → requires a new atom not in v4 (block_healing / suppress_healing).
-- Cantrip upgrade: 1d10 → 2d10 (L5) → 3d10 (L11) → 4d10 (L17).

let chillTouch =
      { kind = "spell"
      , id = "chill_touch"
      , name = "Chill Touch"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Chill Touch"
          }
      , description =
          "Channeling the chill of the grave, make a melee spell attack against a target within reach. On a hit, the target takes 1d10 Necrotic damage, and it can't regain Hit Points until the end of your next turn. Cantrip Upgrade: The damage increases by 1d10 when you reach levels 5 (2d10), 11 (3d10), and 17 (4d10)."
      , mechanics =
          { family = "activation"
          , level = 0
          , school = "necromancy"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "attack_roll"
                , attachment =
                    { kind = "target"
                    , selection = { mode = "one" }
                    }
                , attackKind = "melee_spell_attack"
                , onHit =
                    { kind = "damage"
                    , damageType = "necrotic"
                    , amount =
                        { kind = "threshold_tiers"
                        , axis = "character"
                        , base = { dice = 1, dieSize = 10 }
                        , tiers =
                            [ { atLevel = 5, override = { dice = 2 } }
                            , { atLevel = 11, override = { dice = 3 } }
                            , { atLevel = 17, override = { dice = 4 } }
                            ]
                        }
                    }
                , onMiss = { kind = "none" }
                }
              ]
          }
      }

in  chillTouch
