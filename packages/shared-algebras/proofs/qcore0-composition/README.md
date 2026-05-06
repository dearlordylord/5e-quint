# QCORE0 Composition Spike

This directory is a research artifact, not production rule-core code.

The spike isolates Quint composition patterns for the next rule-core plan:

- `qcore0_damage_contract.qnt` and `qcore0_action_contract.qnt` are stateless
  contract/procedure modules.
- `qcore0_damage_impl.qnt` is a small stateful implementation module.
- `qcore0_contract_consumer.qnt` imports only stateless procedure facts.
- `qcore0_stateful_impl_consumer.qnt` imports one stateful implementation
  module and delegates `init`, `step`, and `invariant`.
- `qcore0_unused_state_import.qnt` checks whether a qualified import of an
  unused stateful module pollutes the local state machine.
- `qcore0_shallow_integration.qnt` composes two stateless procedure contracts
  into one bounded integration machine.
- `qcore0_blowup_poc.qnt` gives a controlled narrow/wide state-space contrast.

The intended result is an architectural decision: use stateless contract modules
for reusable rule procedures, keep stateful modules shallow and owned by their
entrypoint, and reserve broad integration modules for measured composition
proofs.
