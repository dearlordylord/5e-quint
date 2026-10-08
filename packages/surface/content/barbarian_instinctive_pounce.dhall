-- SRD 5.2.1 classes.md:302-305.
{ kind = "class_feature"
, id = "barbarian_instinctive_pounce"
, name = "Instinctive Pounce"
, className = "barbarian"
, acquiredAtLevel = 7
, provenance = { kind = "srd-5.2.1", section = "classes.md:302-305" }
, mechanics =
    { family = "ongoing_feature_activation_movement_rider"
    , activatesWith = { resourceUnitId = "barbarian_rage" }
    , movement = { optional = True, maximum = "half_current_speed", opportunityAttacks = "ordinary" }
    }
}
