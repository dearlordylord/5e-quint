-- Fire Bolt — SRD 5.2.1 Cantrip, Evocation.
--
-- RAW (Spells/Descriptions-E-L#Fire Bolt):
--   "You hurl a mote of fire at a creature or an object within range.
--    Make a ranged spell attack against the target. On a hit, the
--    target takes 1d10 Fire damage. A flammable object hit by this
--    spell starts burning if it isn't being worn or carried."
--   "Cantrip Upgrade: The damage increases by 1d10 when you reach
--    levels 5 (2d10), 11 (3d10), and 17 (4d10)."
--
-- Family: activation (single attack_roll phase).
-- Ranged spell attack; on hit: 1d10 Fire damage (cantrip scaling).
--
-- PARTIAL: the ignition rider ("a flammable object hit by this spell
-- starts burning if it isn't being worn or carried") is DEFERRED as
-- DM agenda (world-object / narrative mutation per
-- plans/CONTENT_SURFACE_DEFERRED.md §B — same class as
-- create_food_and_water, stone_shape, gentle_repose). Igniting
-- unattended flammable objects is a world-state effect the session
-- owns; the content surface does not model object material, the
-- worn/carried predicate, nor burning-object state. Core attack +
-- damage authored here; ignition rider omitted.
--
-- The "creature or object" target admission is collapsed to
-- `target / one` because Attachment has no object variant today (see
-- DEFERRED.md §B world-object discussion). The attack-roll-against-
-- object branch is session-resolved.

let fireBolt =
      { kind = "spell"
      , id = "fire_bolt"
      , name = "Fire Bolt"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Fire Bolt"
          }
      , description =
          "You hurl a mote of fire at a creature or an object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 Fire damage. A flammable object hit by this spell starts burning if it isn't being worn or carried. Cantrip Upgrade: The damage increases by 1d10 when you reach levels 5 (2d10), 11 (3d10), and 17 (4d10)."
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
                    { kind = "target"
                    , selection = { mode = "one" }
                    }
                , attackKind = "ranged_spell_attack"
                , onHit =
                    [ { kind = "damage"
                      , damageType = "fire"
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
                    ]
                , onMiss = [ { kind = "none" } ]
                }
              ]
          }
      }

in  fireBolt
