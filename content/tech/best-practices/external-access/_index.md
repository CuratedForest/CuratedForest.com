---
title: External Access
weight: 3
type: docs
draft: true
aliases:
  - /tech/running-software/external-access/
  - /tech/running-software/best-practices/external-access/
author_reviewed: false
editor_reviewed: false
---

How services are reached from outside the local network — and, just as
importantly, how they're *not*.

## Default posture

- **Local-first.** Most services are only reachable on the LAN. Nothing is
  exposed to the public internet unless there's a concrete reason.
- **No port-forwarding of raw services.** Direct inbound ports to
  application servers are avoided.

## When remote access is needed

- **Reverse proxy** in front of anything that must be publicly reachable,
  terminating TLS and handling auth.
- **Identity in front of the app** rather than trusting the app's own login
  where possible.

The specific proxy and overlay tooling picks live under
[Picking Software](/tech/software-picks/).
