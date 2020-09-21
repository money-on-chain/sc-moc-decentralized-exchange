# Changer Scripts -- WORK IN PROGRESS --

This folder contains a _pre-alpha_ set of scripts and tools to facilitate change contracts execution. They are _by no mean_ ready to be use on mainet networks.
On general basis, they follow this standard:

- On `script-config` there are general network configurations
- Some `input` arguments are _hardcoded_ on each script as necessary, on a `const input = { ... }` section at the beginning, other might be required as script arguments.
- The output will be console logged (TxHash -> confirmation -> receipt | error )

## Dependencies

- Contracts must be compiled into `~/build/contracts`
