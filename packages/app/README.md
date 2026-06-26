# @dnd/app

React application package for local character-creation, battle, and admin
mirror experiences.

Character Sheet state in app components follows the runtime boundary:
stored inputs keep mutable play state and selections, while display summaries
derive capacities through `@dnd/character-sheet-runtime` projections. Hit Point
Maximum, Hit Dice capacity, ordinary Spell Slot capacity, Pact Slot capacity,
and resource capacity are not app-owned state; they come from the finalized
Character Build and installed Unit facts. The app may render those capacities
beside current HP, spent Hit Dice, slot expenditures, and resource
expenditures, but it must not keep a parallel capacity model.
