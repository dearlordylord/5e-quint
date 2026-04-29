-- Find Familiar — SRD 5.2.1 Spell, Level 1, Conjuration.
-- Family: spawned_creature (§C4a simplest validation ref — no attack,
-- cast-time creature-type choice, one-at-a-time cap, deliverable-
-- touch-spell utility).
--
-- PARTIAL — Beast stat block deferred to catalog:
--   RAW: "the familiar has the statistics of the chosen form (see
--   'Monsters'), though it is a Celestial, Fey, or Fiend (your
--   choice) instead of a Beast." The spell text does NOT inline a
--   stat block — the caller supplies the stats of the chosen CR-0
--   Beast (Bat, Cat, Frog, Hawk, Lizard, Octopus, Owl, Rat, Raven,
--   Spider, Weasel, etc.). The surface's `spawned_creature` family
--   requires an inline stat block; we author Owl-like placeholder
--   values (a common familiar choice) and treat the Beast roster +
--   real ability scores as caller-provided. This is closer to §C4b
--   (catalog reanimation pattern) than §C4a and the coupling is
--   flagged for reconsideration when §C4b lands. The override-only
--   fields driven by the spell (creature-type choice, one-at-a-time
--   cap, telepathy/touch-delivery utility, dismissal/pocket-dimension
--   mechanics) are faithfully encoded.
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
          , statBlock =
              { displayName = "Familiar (CR-0 Beast form)"
              , size = "tiny"
              , creatureType =
                  { kind = "choice"
                  , label = "creature type"
                  , options = [ "celestial", "fey", "fiend" ]
                  }
              -- Placeholder values based on a representative CR-0
              -- Beast (Owl). Actual stat block comes from the Monsters
              -- catalog per caller's choice; flagged PARTIAL above.
              , ac = { kind = "literal", value = 11 }
              , hp = { kind = "literal", value = 1 }
              , speeds =
                  [ { kind = "walk"
                    , feet = { kind = "literal", value = 5 }
                    , requiresSlotLevel = None Natural
                    }
                  , { kind = "fly"
                    , feet = { kind = "literal", value = 60 }
                    , requiresSlotLevel = None Natural
                    }
                  ]
              , abilityScores =
                  { str = 3, dex = 13, con = 8, int = 2, wis = 12, cha = 7 }
              , actions = {=}
              , traits =
                  [ { name = "Telepathic Connection"
                    , description =
                        "While your familiar is within 100 feet of you, you can communicate with it telepathically. As a Bonus Action, you can see through the familiar's eyes and hear what it hears until the start of your next turn."
                    }
                  , { name = "Touch-Spell Delivery"
                    , description =
                        "When you cast a spell with a range of touch, your familiar can deliver the touch. Your familiar must be within 100 feet of you, and it must take a Reaction to deliver the touch when you cast the spell."
                    }
                  ]
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
