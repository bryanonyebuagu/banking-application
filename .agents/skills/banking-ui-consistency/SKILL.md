---
name: banking-ui-consistency
description: Implement or review banking screens against supplied references and this repository's tokens, accessible components and responsive conventions.
---

# Banking UI consistency

Read ../../../AGENTS.md and ../../../DESIGN_SYSTEM.md, relevant PRD sections and ../../../docs/references/README.md. Inspect the current shared components and feature shell before changing a screen. Respect the current phase boundary.

Inspect available reference images at their stated viewport; distinguish measured values from provisional defaults. Do not claim to have inspected unavailable private screens. Reuse the existing shell, primitives and BankLogo. Change shared tokens centrally when evidence supports it; avoid screen-specific approximations of an existing component.

Keep presentation separate from banking commands. Forms call authorized services and render persisted outcomes, including uncertain financial results. Provide all PRD async states and explicit future-phase unavailability; never fake success or financial data.

Compare desktop/mobile layouts at matching dimensions, including long values, validation errors and empty states. Check focus order, dialog restoration, labels, contrast, money formatting, zoom/reflow and table readability. Record unresolved reference gaps honestly and fix meaningful differences before completion.
