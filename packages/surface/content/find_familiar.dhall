-- Find Familiar — SRD 5.2.1 Spell, Level 1, Conjuration.
-- Family: spawned_creature (§C4a simplest validation ref — no attack,
-- cast-time creature-type choice, one-at-a-time cap, deliverable-
-- touch-spell utility).
--
-- Beast stat block catalog boundary:
--   RAW: "the familiar has the statistics of the chosen form (see
--   'Monsters'), though it is a Celestial, Fey, or Fiend (your
--   choice) instead of a Beast." The spell text does not inline a stat
--   block. The normal named forms are catalog references, and "another
--   Beast that has a Challenge Rating of 0" is represented as an
--   eligibility rule over the same Stat Block catalog.
--
-- Companion execution reads touch delivery, temporary dismissal/recall, and
-- recast outcomes from the typed companion lifecycle below.

let findFamiliar =
      { kind = "spell"
      , id = "find_familiar"
      , name = "Find Familiar"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Find Familiar"
          }

      , mechanics =
          { family = "spawned_creature"
          , level = 1
          , school = "conjuration"
          , castingTime = { kind = "action", ritual = True }
          , range = { kind = "point", feet = 10 }
          , components =
              { v = True
              , s = True
              , m = Some "burning incense worth 10+ GP, which the spell consumes"
              , materialCostGp = Some 10
              , materialConsumed = Some True
              }
          , duration = { kind = "instantaneous" }
          , creature =
              { kind = "familiar_form_catalog"
              , normalForms =
                  [ { displayName = "Bat", formId = "bat", statBlockId = "stat_block_bat" }
                  , { displayName = "Cat", formId = "cat", statBlockId = "stat_block_cat" }
                  , { displayName = "Frog", formId = "frog", statBlockId = "stat_block_frog" }
                  , { displayName = "Hawk", formId = "hawk", statBlockId = "stat_block_hawk" }
                  , { displayName = "Lizard", formId = "lizard", statBlockId = "stat_block_lizard" }
                  , { displayName = "Octopus", formId = "octopus", statBlockId = "stat_block_octopus" }
                  , { displayName = "Owl", formId = "owl", statBlockId = "stat_block_owl" }
                  , { displayName = "Rat", formId = "rat", statBlockId = "stat_block_rat" }
                  , { displayName = "Raven", formId = "raven", statBlockId = "stat_block_raven" }
                  , { displayName = "Spider", formId = "spider", statBlockId = "stat_block_spider" }
                  , { displayName = "Weasel", formId = "weasel", statBlockId = "stat_block_weasel" }
                  ]
              , additionalNormalFormEligibility =
                  { kind = "challengeRatingZeroBeast" }
              }
          , mode =
              { label = "creature type"
              , options =
                  [ { id = "celestial"
                    , displayName = "Celestial"
                    , overrides = { creatureType = "celestial" }
                    }
                  , { id = "fey"
                    , displayName = "Fey"
                    , overrides = { creatureType = "fey" }
                    }
                  , { id = "fiend"
                    , displayName = "Fiend"
                    , overrides = { creatureType = "fiend" }
                    }
                  ]
              }
          , control =
              { initiative = "own_roll"
              , commandCost = { kind = "no_action_required" }
              , commandRangeFeet = 100
              , defaultBehavior = "independent"
              , telepathy =
                  { rangeFeet = 100
                  , sharedSenses = "bonus_action"
                  }
              , oneAtATime = True
              }
          , dismissal =
              { onZeroHp = "disappears"
              , onSpellEnd = "disappears"
              , manualDismiss = "magic_action"
              , leavesBehind = "equipment"
              }
          , companionLifecycle =
              { kind = "bound_companion"
              , touchSpellDelivery =
                  { spellRange = "touch"
                  , companionWithinFeetOfCaster = 100
                  , companionCost = "reaction"
                  , timing = "when_caster_casts_spell"
                  }
              , temporaryDismissal =
                  { cost = "magic_action"
                  , destination = "pocket_dimension"
                  , recall =
                      { cost = "magic_action"
                      , placement =
                          { kind = "unoccupied_space_within_feet_of_caster"
                          , maxDistanceFeet = 30
                          }
                      }
                  }
              , recast =
                  { existingCompanion = "adopt_new_eligible_form"
                  , zeroHitPointDisappearance = "reappear"
                  }
              }
          }
      }

in  findFamiliar
