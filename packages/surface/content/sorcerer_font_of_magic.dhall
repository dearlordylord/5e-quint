-- Font of Magic - SRD 5.2.1 Sorcerer level 2.
--
-- Sorcery Points form a named point pool whose maximum equals Sorcerer
-- level from level 2 onward. Expended points return on a Long Rest.
-- Font of Magic also owns the two conversion rules:
--   * expend one spell slot for points equal to that slot's level
--     with no action required;
--   * spend points as a Bonus Action to create one spell slot from the
--     Creating Spell Slots table; the created slot vanishes on Long Rest.
--
-- This record is catalog/source-fact authoring. Character resource
-- projection and conversion execution are later owner tasks.

let SpellSlotCreationOption =
      { spellSlotLevel : Natural
      , pointCost : Natural
      , minimumClassLevel : Natural
      }

let PointGain = { kind : Text }

let CreatedSlotExpiry = { kind : Text }

let Operation =
      { kind : Text
      , activationCost : { kind : Text }
      , pointGain : Optional PointGain
      , createdSlotExpiry : Optional CreatedSlotExpiry
      , options : Optional (List SpellSlotCreationOption)
      }

let slotToPoints =
      { kind = "spell_slot_to_point_pool"
      , activationCost = { kind = "free" }
      , pointGain = Some { kind = "equal_to_spell_slot_level" }
      , createdSlotExpiry = None CreatedSlotExpiry
      , options = None (List SpellSlotCreationOption)
      } : Operation

let pointsToSlot =
      { kind = "point_pool_to_spell_slot"
      , activationCost = { kind = "bonus_action" }
      , pointGain = None PointGain
      , createdSlotExpiry = Some { kind = "long_rest" }
      , options =
          Some
            [ { spellSlotLevel = 1, pointCost = 2, minimumClassLevel = 2 }
            , { spellSlotLevel = 2, pointCost = 3, minimumClassLevel = 3 }
            , { spellSlotLevel = 3, pointCost = 5, minimumClassLevel = 5 }
            , { spellSlotLevel = 4, pointCost = 6, minimumClassLevel = 7 }
            , { spellSlotLevel = 5, pointCost = 7, minimumClassLevel = 9 }
            ]
      } : Operation

let fontOfMagic =
      { acquiredAtLevel = 2
      , className = "sorcerer"
      , description =
          "SRD Sorcerer level 2 Sorcery Point pool and spell-slot conversion source facts. A Sorcerer's Sorcery Point maximum equals Sorcerer level from level 2, all expended Sorcery Points return on a Long Rest, a spell slot can be expended for Sorcery Points equal to the slot's level with no action, and Sorcery Points can be spent as a Bonus Action to create a temporary spell slot that vanishes on Long Rest."
      , id = "sorcerer_font_of_magic"
      , kind = "class_feature"
      , mechanics =
          { family = "resource_pool"
          , resource =
              { kind = "point_pool"
              , poolId = "sorcery_points"
              , cap =
                  { kind = "linear_per_level"
                  , axis = "class"
                  , base = 2
                  , perLevel = 1
                  , startingAtLevel = 2
                  }
              }
          , resetCadence = { kind = "long_rest" }
          , operations = [ slotToPoints, pointsToSlot ] : List Operation
          }
      , name = "Font of Magic"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Sorcerer.md:33-54,87-109"
          }
      }

in  fontOfMagic
