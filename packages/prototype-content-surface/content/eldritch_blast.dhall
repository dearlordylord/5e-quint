-- Eldritch Blast — SRD 5.2.1 Cantrip, Evocation.
--
-- RAW (Spells/Descriptions-E-L#Eldritch Blast):
--   "Make a ranged spell attack against one creature or object in
--    range. On a hit, the target takes 1d10 Force damage."
--   "The spell creates two beams at level 5, three beams at level 11,
--    and four beams at level 17. You can direct the beams at the same
--    target or at different ones. Make a separate attack roll for
--    each beam."
--
-- MODELING NOTE. `choose_up_to` with `repeatsAllowed` captures the
-- beam target multiset and character-tier count. The separate attack
-- roll per beam is an execution obligation for repeated selections.

let eldritchBlast =
      { kind = "spell"
      , id = "eldritch_blast"
      , name = "Eldritch Blast"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Eldritch Blast"
          }
      , description =
          "You hurl a beam of crackling energy. Make a ranged spell attack against one creature or object in range. On a hit, the target takes 1d10 Force damage. Cantrip Upgrade. The spell creates two beams at level 5, three beams at level 11, and four beams at level 17. You can direct the beams at the same target or at different ones. Make a separate attack roll for each beam."
      , mechanics =
          { family = "activation"
          , level = 0
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "attack_roll"
                , attachment =
                    { kind = "hole"
                    , holeId = "eldritch_blast_beam_target"
                    , label = "beam target (creature or object)"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "choose_up_to"
                            , count =
                                { kind = "threshold_tiers"
                                , axis = "character"
                                , base = 1
                                , tiers =
                                    [ { atLevel = 5, value = 2 }
                                    , { atLevel = 11, value = 3 }
                                    , { atLevel = 17, value = 4 }
                                    ]
                                }
                            , repeatsAllowed = True
                            }
                        }
                    }
                , attackKind = "ranged_spell_attack"
                , onHit =
                    [ { kind = "damage"
                      , damageType = "force"
                      , amount =
                          { kind = "fixed"
                          , expr = { dice = 1, dieSize = 10 }
                          }
                      }
                    ]
                , onMiss = [ { kind = "none" } ]
                }
              ]
          }
      }

in  eldritchBlast
