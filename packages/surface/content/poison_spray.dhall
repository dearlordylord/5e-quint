-- Poison Spray — SRD 5.2.1 Cantrip, Necromancy.
-- Family: activation (single attack_roll phase).
-- Ranged spell attack; on hit: 1d12 Poison damage (cantrip scaling).
-- No secondary rider — pure attack-roll damage.
-- Cantrip upgrade: 1d12 → 2d12 (L5) → 3d12 (L11) → 4d12 (L17).

let poisonSpray =
      { kind = "spell"
      , id = "poison_spray"
      , name = "Poison Spray"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-N-R#Poison Spray"
          }
      , description =
          "You spray toxic mist at a creature within range. Make a ranged spell attack against the target. On a hit, the target takes 1d12 Poison damage. Cantrip Upgrade: The damage increases by 1d12 when you reach levels 5 (2d12), 11 (3d12), and 17 (4d12)."
      , mechanics =
          { family = "activation"
          , level = 0
          , school = "necromancy"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "attack_roll"
                , attachment =
                    { kind = "hole"
                    , holeId = "poison_spray_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , attackKind = "ranged_spell_attack"
                , onHit =
                    [ { kind = "damage"
                      , damageType = "poison"
                      , amount =
                          { kind = "threshold_tiers"
                          , axis = "character"
                          , base = { dice = 1, dieSize = 12 }
                          , tiers =
                              [ { atLevel = 5, override = { dice = 2 } }
                              , { atLevel = 11, override = { dice = 3 } }
                              , { atLevel = 17, override = { dice = 4 } }
                              ]
                          }
                      }
                    ]
                , onMiss = [ { kind = "none" } ]
                }
              ]
          }
      }

in  poisonSpray
