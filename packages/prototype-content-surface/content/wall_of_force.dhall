-- Wall of Force — SRD 5.2.1 Spell, level 5, Evocation.
--
-- RAW (Spells/Descriptions-S-Z#Wall of Force):
--   "An Invisible wall of force springs into existence at a point you
--    choose within range."
--   "You can form it into a hemispherical dome or a globe with a radius
--    of up to 10 feet, or you can shape a flat surface made up of ten
--    10-foot-by-10-foot panels. Each panel must be contiguous with
--    another panel."
--   "If the wall cuts through a creature's space when it appears, the
--    creature is pushed to one side of the wall (you choose which side)."
--   "Nothing can physically pass through the wall. It is immune to all
--    damage and can't be dispelled by Dispel Magic. A Disintegrate spell
--    destroys the wall without harming anything inside. The wall also
--    extends into the Ethereal Plane and blocks ethereal travel through
--    the wall."
--
-- PARTIAL: panel arrangement and chosen push side are player/DM geometry
-- choices. The flat panel option is represented as its maximum rectangular
-- envelope; dome/globe is represented as a radius-10 sphere shape option.

let ShapeOption : Type =
      { kind : Text
      , maxLengthFeet : Optional Double
      , maxHeightFeet : Optional Double
      , thicknessFeet : Optional Double
      , radiusFeet : Optional Double
      }

let flatPanels : ShapeOption =
      { kind = "wall_volume"
      , maxLengthFeet = Some 100.0
      , maxHeightFeet = Some 10.0
      , thicknessFeet = Some 0.0208333
      , radiusFeet = None Double
      }

let globeOrDome : ShapeOption =
      { kind = "sphere"
      , maxLengthFeet = None Double
      , maxHeightFeet = None Double
      , thicknessFeet = None Double
      , radiusFeet = Some 10.0
      }

let Shape : Type =
      { kind : Text
      , options : Optional (List ShapeOption)
      , maxLengthFeet : Optional Double
      , maxHeightFeet : Optional Double
      , thicknessFeet : Optional Double
      , radiusFeet : Optional Double
      }

let forceWallShape : Shape =
      { kind = "choice"
      , options = Some [ flatPanels, globeOrDome ]
      , maxLengthFeet = None Double
      , maxHeightFeet = None Double
      , thicknessFeet = None Double
      , radiusFeet = None Double
      }

let EffectLeaf : Type =
      { kind : Text
      , direction : Optional Text
      , distanceFeet : Optional Natural
      , maxSize : Optional Text
      , shape : Optional Shape
      , scope : Optional Text
      , spellId : Optional Text
      }

let noneLeaf =
      { direction = None Text
      , distanceFeet = None Natural
      , maxSize = None Text
      , shape = None Shape
      , scope = None Text
      , spellId = None Text
      }

let createWall : EffectLeaf =
      noneLeaf
        //  { kind = "create_object"
            , maxSize = Some "gargantuan"
            , shape = Some forceWallShape
            }

let pushCreatures : EffectLeaf =
      noneLeaf
        //  { kind = "force_move"
            , direction = Some "push"
            , distanceFeet = Some 5
            }

let Effect : Type =
      { kind : Text
      , direction : Optional Text
      , distanceFeet : Optional Natural
      , maxSize : Optional Text
      , shape : Optional Shape
      , scope : Optional Text
      , spellId : Optional Text
      , effects : Optional (List EffectLeaf)
      }

let noneEffect =
      noneLeaf // { effects = None (List EffectLeaf) }

let createAndPush : Effect =
      noneEffect
        //  { kind = "composite"
            , effects = Some [ createWall, pushCreatures ]
            }

let blockPhysicalPassage : Effect =
      noneEffect
        //  { kind = "block_travel"
            , scope = Some "physical_passage"
            }

let immuneToDamage : Effect =
      noneEffect // { kind = "object_immune_to_all_damage" }

let disintegrateDestroys : Effect =
      noneEffect
        //  { kind = "object_destroyed_by_spell"
            , spellId = Some "disintegrate"
            }

let notDispelled : Effect =
      noneEffect
        //  { kind = "cannot_be_dispelled_by_spell"
            , spellId = Some "dispel_magic"
            }

let blockEtherealTravel : Effect =
      noneEffect // { kind = "block_ethereal_travel" }

let wallAttachment =
      { kind = "hole"
      , holeId = "wall_of_force_area"
      , label = "force wall"
      , value =
          { kind = "area"
          , shape = forceWallShape
          , origin = { kind = "point_within_range" }
          }
      }

let Operation : Type =
      { trigger : { kind : Text }, effect : Effect }

let wallOfForce =
      { kind = "spell"
      , id = "wall_of_force"
      , name = "Wall of Force"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Wall of Force"
          }
      , description =
          "An Invisible wall of force springs into existence at a point within range. It can be a hemispherical dome or globe with a radius of up to 10 feet, or a flat surface made of ten contiguous 10-foot-by-10-foot panels. If the wall cuts through a creature's space when it appears, the creature is pushed to one side. Nothing can physically pass through it. It is immune to all damage and can't be dispelled by Dispel Magic. Disintegrate destroys it without harming anything inside. The wall extends into the Ethereal Plane and blocks ethereal travel through it."
      , mechanics =
          { family = "ongoing_effect"
          , level = 5
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = Some "a shard of glass" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , attachment = wallAttachment
          , initialPhase =
              { kind = "direct"
              , attachment = wallAttachment
              , effects = [ createAndPush ]
              }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect = blockPhysicalPassage
                }
              , { trigger = { kind = "passive" }, effect = immuneToDamage }
              , { trigger = { kind = "passive" }, effect = notDispelled }
              , { trigger = { kind = "passive" }
                , effect = disintegrateDestroys
                }
              , { trigger = { kind = "passive" }
                , effect = blockEtherealTravel
                }
              ] : List Operation
          }
      }

in  wallOfForce
