-- SRD 5.2.1 classes.md:4830-4832.
{ kind = "class_feature"
, id = "fighter_tactical_shift"
, name = "Tactical Shift"
, className = "fighter"
, acquiredAtLevel = 5
, provenance = { kind = "srd-5.2.1", section = "classes.md:4830-4832" }
, mechanics =
    { family = "bonus_action_healing_movement_rider"
    , activatesWith = { resourceUnitId = "fighter_second_wind" }
    , movement =
        { optional = True
        , maximum = "half_current_speed"
        , opportunityAttacks = "does_not_provoke"
        }
    }
}
