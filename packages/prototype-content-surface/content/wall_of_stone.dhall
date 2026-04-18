-- Wall of Stone — SRD 5.2.1 Spell, Level 5, Evocation.
--
-- RAW (Spells/Descriptions-W#Wall of Stone):
--   "A nonmagical wall of solid stone springs into existence at a point
--    you choose within range. The wall is 6 inches thick and is composed
--    of ten 10-foot-by-10-foot panels."
--   "If the wall cuts through a creature's space when it appears, the
--    creature is pushed to one side of the wall."
--   "If a creature would be surrounded on all sides by the wall (or the
--    wall and another solid surface), that creature can make a Dexterity
--    saving throw. On a success, it can use its Reaction to move up to
--    its Speed so that it is no longer enclosed by the wall."
--   "Each panel has AC 15 and 30 Hit Points per inch of thickness, and
--    it has Immunity to Poison and Psychic damage."
--   "If you maintain your Concentration on this spell for its full
--    duration, the wall becomes permanent and can't be dispelled."
--
-- Family: activation (single-cast, creates persistent object with
--   concentration-to-permanent promotion).
--
-- PARTIAL. Encoded:
--   • create_object: gargantuan, line shape (100×10 ft approximation
--     of 10 panels at 10×10), durability { acValue=15, hpPerSection=30,
--     damageImmunities=[poison, psychic] }.
--   • force_move push 5 ft for creatures in the wall's footprint at
--     cast time (those whose space the wall cuts through).
--   • Concentration duration upTo 10 minutes with permanentIfMaintainedFull.
--
-- OMITTED (atom_widening — see proposal-wall_of_stone.md):
--   • save_gate for creatures that would be surrounded: on success the
--     creature can use its Reaction to move up to its Speed. There is
--     no EffectAtom for "target may use its Reaction to move up to
--     Speed". Using none for onSuccess would be dishonest (the creature
--     CAN escape). The entire surrounded-creature save is omitted.
--
-- Additional surface gaps noted but not blocking:
--   • Wall shape is "any shape you desire" — line 100×10 is the default
--     configuration; the actual footprint is DM/player-resolved geometry.
--   • 3-inch thick 10×20 ft panel variant not expressible (no per-cast
--     thickness choice on create_object).
--   • "Must merge with existing stone" — architectural constraint,
--     DM-resolved.
--   • Crudely shape for battlements — narrative.

let Shape : Type = { kind : Text, lengthFeet : Natural, widthFeet : Natural }

let Durability : Type =
      { acValue : Natural
      , hpPerSection : Natural
      , damageImmunities : List Text
      }

let CompEffect : Type =
      { kind : Text
      , direction : Optional Text
      , distanceFeet : Optional Natural
      , maxSize : Optional Text
      , shape : Optional Shape
      , durability : Optional Durability
      }

let createWall : CompEffect =
      { kind = "create_object"
      , direction = None Text
      , distanceFeet = None Natural
      , maxSize = Some "gargantuan"
      , shape = Some { kind = "line", lengthFeet = 100, widthFeet = 10 }
      , durability =
          Some
            { acValue = 15
            , hpPerSection = 30
            , damageImmunities = [ "poison", "psychic" ]
            }
      }

let pushCreatures : CompEffect =
      { kind = "force_move"
      , direction = Some "push"
      , distanceFeet = Some 5
      , maxSize = None Text
      , shape = None Shape
      , durability = None Durability
      }

let wallOfStone =
      { kind = "spell"
      , id = "wall_of_stone"
      , name = "Wall of Stone"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-W#Wall of Stone"
          }
      , description =
          "A nonmagical wall of solid stone springs into existence at a point you choose within range. The wall is 6 inches thick and is composed of ten 10-foot-by-10-foot panels. Each panel must be contiguous with another panel. Alternatively, you can create 10-foot-by-20-foot panels that are only 3 inches thick. If the wall cuts through a creature's space when it appears, the creature is pushed to one side of the wall (you choose which side). If a creature would be surrounded on all sides by the wall (or the wall and another solid surface), that creature can make a Dexterity saving throw. On a success, it can use its Reaction to move up to its Speed so that it is no longer enclosed by the wall. The wall can have any shape you desire, though it can't occupy the same space as a creature or object. The wall doesn't need to be vertical or rest on a firm foundation. It must, however, merge with and be solidly supported by existing stone. Each panel has AC 15 and 30 Hit Points per inch of thickness, and it has Immunity to Poison and Psychic damage. Reducing a panel to 0 Hit Points destroys it and might cause connected panels to collapse at the DM's discretion. If you maintain your Concentration on this spell for its full duration, the wall becomes permanent and can't be dispelled. Otherwise, the wall disappears when the spell ends."
      , mechanics =
          { family = "activation"
          , level = 5
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = Some "a cube of granite" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              , permanentIfMaintainedFull = True
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "area"
                    , shape = { kind = "line", lengthFeet = 100, widthFeet = 10 }
                    , origin = { kind = "point_within_range" }
                    }
                , effects =
                    [ { kind = "composite"
                      , effects = [ createWall, pushCreatures ]
                      }
                    ]
                }
              ]
          }
      }

in  wallOfStone
