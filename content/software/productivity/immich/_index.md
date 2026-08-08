---
title: Immich
weight: 2
type: docs
draft: true
aliases:
  - /tech/immich/
  - /software/immich/
---

restore from backup
```

 gunzip --stdout immich-db-backup-1759975200005.sql.gz   | sed "s/SELECT pg_catalog.set_config('search_path', '', false);/SELECT pg_catalog.set_config('search_path', 'public, pg_catalog', true);/g"   | grep -v "CREATE EXTENSION"   | grep -v "CREATE DATABASE"   | grep -v "DROP DATABASE" | psql --dbname=immich --username=immich --host=pg-immich-rw
```
 * Has to be superuser*
