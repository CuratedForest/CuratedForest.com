---
title: Backups
weight: 4
type: docs
draft: false
author_reviewed: false
editor_reviewed: false
---

A backup you've never restored is a hope, not a plan. The goal isn't to
have snapshots — it's to be confident that when something breaks, the
data comes back.

## Principles

- **3-2-1.** At least three copies of anything you care about, on two
  different media, with one copy off-site.
- **Encrypted and deduplicated at rest.** Backups leaving the property are
  encrypted before they leave and deduplicated so the storage bill stays
  sane.
- **Automated and scheduled.** If a backup depends on someone remembering
  to run it, it will eventually stop happening.
- **Test restores.** Restore a random file monthly and a full dataset at
  least yearly. If a restore has never been rehearsed, treat the backup
  as untested.
- **Separate credentials.** The account that writes backups shouldn't be
  able to delete or overwrite historical snapshots — ransomware and
  fat-fingered scripts are both real.

## What gets backed up

- **Application data.** Anything a service can't regenerate: databases,
  photos, home assistant config, notes, source repos.
- **Configuration.** Cluster manifests and Helm values already live in
  Git, but the running state (secrets, PVC contents) still needs to be
  snapshotted.
- **Media and originals.** Photos and video originals live in object
  storage and are backed up separately from the systems that serve them.

## What doesn't

- **Ephemeral caches, build artifacts, and reproducible outputs** — if it
  can be regenerated from something else that *is* backed up, it doesn't
  need its own copy.

## Tooling

The concrete tool used for filesystem-level backups is
[Kopia](/software/shared/kopia-backups/) — encrypted, deduplicated snapshots
pushed to S3-compatible off-site storage. Application-level backups
(database dumps, config exports) run on their own schedules and land in
the same Kopia repository so they inherit the same retention and
off-site policy.
