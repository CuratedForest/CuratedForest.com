---
title: Best Practices
weight: 4
type: docs
draft: false
author_reviewed: false
editor_reviewed: false
---

The operational habits that keep a self-hosted stack healthy over time.

## Configuration

- **Everything in Git.** Cluster manifests, Helm values, and app config are
  version-controlled so changes are reviewable and reversible.
- **Declarative over imperative.** Describe the desired state; let the
  orchestrator converge to it rather than hand-editing running systems.

## Reliability

- **Back up before you need it.** Snapshots are encrypted, deduplicated, and
  pushed off-site (see [Kopia Backups](/software/shared/kopia-backups/)).
- **Test restores.** A backup you've never restored is a hope, not a plan.
- **Pin versions.** Reproducible builds beat "latest" surprises.

## Security

- **Least privilege.** Grant the minimum access a service needs.
- **Secrets stay out of Git.** Use a secrets manager, not plaintext values.
- **Patch regularly.** Boring, scheduled updates beat emergency ones.
