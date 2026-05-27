-- Preserve Life — SRD 5.2.1 Cleric Life Domain level 3.
--
-- RAW (Classes / Cleric / Level 3: Preserve Life):
--   As a Magic Action, expend Channel Divinity to restore a pool of Hit
--   Points equal to five times Cleric level, divided among chosen
--   Bloodied creatures within 30 feet, including yourself. A target
--   can be restored to no more than half its Hit Point Maximum.
--
-- The resource spend references the Cleric Channel Divinity Unit instead
-- of duplicating that resource pool on this feature.

let preserveLife =
      { kind = "class_feature"
      , id = "cleric_preserve_life"
      , name = "Preserve Life"
      , className = "cleric"
      , acquiredAtLevel = 3
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Cleric#Level 3: Preserve Life"
          }
      , description =
          "As a Magic Action, you present your Holy Symbol and expend a use of your Channel Divinity to evoke healing energy that can restore a number of Hit Points equal to five times your Cleric level. Choose Bloodied creatures within 30 feet of yourself, which can include you, and divide those Hit Points among them. This feature can restore a creature to no more than half its Hit Point maximum."
      , mechanics =
          { family = "magic_action_healing_pool"
          , activationCost = { kind = "standard_action", action = "magic" }
          , spends = { resourceUnitId = "cleric_channel_divinity", amount = 1 }
          , range = { kind = "point", feet = 30 }
          , targetSelection =
              { mode = "any_number"
              , targetKinds = [ "creature" ]
              , stateFilter = [ "bloodied" ]
              , includesSelf = True
              }
          , pool = { kind = "class_level_multiplier", multiplier = 5 }
          , perTargetCap = "half_hit_point_maximum"
          }
      }

in  preserveLife
