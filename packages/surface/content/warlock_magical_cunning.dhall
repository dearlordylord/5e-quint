-- Magical Cunning - SRD 5.2.1 Warlock level 2.
--
-- The feature does not define a new Spell Slot pool. It recovers expended
-- Pact Slots from the existing Warlock Pact Magic source, up to half the
-- current Pact Slot maximum rounded up, after a 1-minute rite. The feature use
-- resets on Long Rest.

let magicalCunning =
      { acquiredAtLevel = 2
      , className = "warlock"
      , description =
          "SRD Warlock level 2 Magical Cunning Pact Slot recovery source facts. A Warlock can perform a 1-minute esoteric rite to regain expended Pact Magic spell slots, up to half the Pact Slot maximum rounded up, and can't use this feature again until finishing a Long Rest."
      , id = "warlock_magical_cunning"
      , kind = "class_feature"
      , mechanics =
          { family = "pact_slot_recovery"
          , activationCost = { kind = "one_minute_rite" }
          , resource = { kind = "pact_slots", source = "class_record_pact_magic" }
          , requiresExpendedSlots = True
          , recoveryCap = { kind = "half_maximum_rounded_up" }
          , resetCadence = { kind = "long_rest" }
          }
      , name = "Magical Cunning"
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Warlock.md:35-36,92-94" }
      }

in  magicalCunning
