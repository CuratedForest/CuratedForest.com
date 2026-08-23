---
title: Updates
weight: 2
type: docs
draft: true
author_reviewed: false
editor_reviewed: false
---

How software on the Curated Forest gets updated, and the habits that keep
updates boring instead of scary.

## Principles

- **Scheduled, not reactive.** Boring, scheduled updates beat emergency
  ones. A regular cadence means no single update carries the risk of a
  year's worth of drift.
- **Pin versions.** Reproducible builds beat "latest" surprises. What runs
  in the cluster is the version that's recorded in Git, not whatever the
  registry is serving today.
- **One change at a time.** A single update per window means a broken
  state is easy to attribute and easy to roll back.
- **Rollback is part of the update.** If I can't get back to the previous
  state quickly, the update isn't done.

## Cadence

## What gets updated