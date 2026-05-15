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
-- DEFERRED — spell-driven utility atoms:
--   • Telepathic connection (100 ft) and shared-senses bonus action:
--     encoded via control.telepathy.
--   • "Your familiar can deliver the touch" (touch-spell proxy within
--     100 ft, costs the familiar's reaction): the underlying
--     deliver_touch_spell atom exists in the v4 effect vocabulary but
--     no EffectAtom variant carries it through this family yet.
--     Recorded here as a trait with no mechanical effect.
--   • Pocket-dimension dismissal/recall (30 ft reappearance on Magic
--     action): CreatureDismissal.manualDismiss = "magic_action"
--     captures the sheathe/recall cycle at a coarse grain; the 30-ft
--     reappearance radius is not yet modeled.
--   • "Adopt a new eligible form" on recast: matches
--     `replace_on_recast` lifecycle atom; not threaded into the
--     family yet.

let findFamiliar =
      { kind = "spell"
      , id = "find_familiar"
      , name = "Find Familiar"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Find Familiar"
          }
      , description =
          "You gain the service of a familiar, a spirit that takes an animal form you choose from a list of CR-0 Beasts. The familiar has the statistics of the chosen form, though it is a Celestial, Fey, or Fiend (your choice) instead of a Beast. It obeys your commands, acts on its own Initiative, and cannot attack. While within 100 feet you can communicate telepathically and as a Bonus Action see/hear through its senses. It can deliver your touch spells. It disappears at 0 HP and is replaced by recasting; One Familiar Only."
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
          }
      }

in  findFamiliar
