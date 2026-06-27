---
title: Area Based Features
type: docs
weight: 40
---

The Leader/Follower and Button stacks are great when you already have entities to wire together — but sometimes the user just needs an entity to *exist* in an area so other things can be wired against it. Area Based Features fill that gap.

Tag an area with `(Area |Floor |)Provides: <FeatureName>` and the system generates the corresponding MQTT discovery entity for you. Built-in features cover common cases (VPD sensor for grow areas, tracked-PSI number, area manifest); user-declared features default to a `select` whose options can come from either entity labels (`(scope-prefix)Provides Option: <FeatureName>`) or static label declarations (`(scope-prefix)Provides Options: <FeatureName>: A|B|C`). Remove the label and the discovery entity is retracted (empty retained payload). The whole pipeline survives HA restarts because the discovery topics are retained and re-published on every `homeassistant.start`.

## Architecture
The pipeline is split into four layers with deliberate responsibility boundaries — the state sensor stays cheap, the automation does the parsing, and the scripts build & publish.

```
sensor.labeled_feature_areas_state.label_map  ← lightweight trigger surface
            │  (state-attribute change on label_map)
            ▼
automation.labeled_feature_areas              ← diff added/removed, route both
                                                creates and deletes to the
                                                per-feature script
       ┌───────────────────┬─────────────────────────┐
       │ added (created)   │ removed (delete: true)  │
       ▼                   ▼
                  script.labeled_feature_area  (owns canonical naming;
                                                short-circuits on _delete)
                                ▼
                  script.labeled_feature_entities  (publish or retract
                                                    MQTT discovery)
```

The layer split:

- **`sensor.labeled_feature_areas_state.label_map`** — *trigger surface, nothing more*. The sensor's single job is to (a) re-render when label / area / floor registries change and (b) emit a flat `(scope_id, label)` registry the automation can diff. Each entry is keyed `<scope_id>||<label>` and carries exactly five fields: `scope_id`, `label`, `scope`, `declaring_area_id`, `component`. There is **no `object_id`** — the sensor doesn't know feature names, doesn't have a `Manifest` / `Shoot Zone` / `Root Zone` ladder, and doesn't have a per-feature default-component lookup. `component` defaults to `select` for every entry; the only override the sensor honors is a `(Area |Floor |)Provides <Label> Component: <comp>` modifier label on the declaring area. Adding a new built-in feature requires **zero** sensor changes.

  This is the important boundary: the sensor doesn't parse icon, initial, min/max/step, unit, device_class, options, or any feature-specific knob. The script owns every one of those, read fresh from `labels(declaring_area_id)` at dispatch time. The sensor stays small, re-renders are cheap, and the template's surface area doesn't grow with the feature catalog.

- **`automation.labeled_feature_areas`** — *trivial diff-and-dispatch*. Reads `trigger.to_state.attributes.label_map` (and `trigger.from_state.attributes.label_map` on state triggers), builds `now` / `prev` maps keyed by `<scope_id>||<label>`, computes `added = now - prev` and `removed = prev - now`. Entries whose `component` changed appear in both lists (a `Component:` override swap becomes a remove-then-add — natural rename semantics). Removes run first so the stale discovery topic retracts before the new one publishes. On `homeassistant.start` every entry in `now` is treated as added (idempotent re-publish for restart resilience). Both `added` and `removed` are dispatched to **`script.labeled_feature_area`**; removes pass `delete: true`. The automation owns no parsing logic and no naming logic — it just routes.

- **`script.labeled_feature_area`** — *the feature's source of truth, including object-id naming*. Receives `feature` (== the label name), `scope`, `scope_id`, `feature_data` (the 5-field dict from the sensor, including `declaring_area_id`), and an optional `delete: bool`. At the top of the script `delete` is normalized into a local `_delete` var. Then a `choose:` block branches on feature name — `Manifest`, `Shoot Zone`, `Root Zone`, generic-select (default), generic-component (when `Component:` override is set). **Each branch computes its canonical object_id first**, then short-circuits on `_delete` (calling `labeled_feature_entities` with `delete: true` and stopping), and only after the short-circuit does it run any feature-specific work — option-pool resolution, manifest entity enumeration, etc. This ordering is essential: on the delete path the labels that drive pool resolution have already been removed, so deferring the short-circuit until after pool resolution would fall through into the "no options resolved" error branch instead of retracting the entity. On the create path, the script reads `labels(declaring_area_id)` to pull every override (icon, initial, min/max/step, unit, device_class), parses `Provides Options: <F>: a|b=Label|c` for static option lists, and resolves the scope entity set (`area_entities + device_entities` / floor union / global pool) to collect dynamic options from entities labeled `Provides Option: <F>` (with `Provides Option <F>: <CustomLabel>` overrides).

- **`script.labeled_feature_entities`** — *publishes MQTT*. Generic discovery creator and retract helper. Builds the discovery JSON from named fields (with an `extra:` dict for arbitrary additions). `delete: true` publishes an empty retained payload to retract the entity. `create_mode` (`always` (default) | `if_missing` | `never`) controls when the discovery config is (re)published — `if_missing` skips publish when the entity already exists; `never` skips the discovery publish entirely so the call only seeds state/attributes against an already-created entity. `initialize_mode` (controls `initial_state`) and `attributes_mode` (controls `initial_attributes`) both take `set_if_missing` (default) | `always` | `never`. `component` is constrained to HA's supported MQTT discovery components (closed dropdown). Routes errors through `script.labeled_feature_error_mode`.

The ownership boundary is: *the sensor exposes only what the automation must see to trigger and diff (which (scope_id, label) pairs exist, with what component); the per-feature script owns canonical naming and every feature-specific knob, reading the area's labels fresh at dispatch.* This mirrors the existing Leader/Follower pattern (sensor exposes derived state, automation reacts, scripts do side-effects) but pushes feature-specific resolution — including object_id derivation — all the way to the script. Adding a new built-in area feature is a one-place change: add a `choose:` branch to `labeled_feature_area` that knows its canonical object_id, its short-circuit-on-`_delete` block, and its create-side payload builder. The sensor, the automation, and `labeled_feature_entities` never need to change.


## Scope semantics
The scope prefix on a `Provides:` label decides three things together: where the generated entity lives, what entity pool it draws from, and which Option labels participate.

| Label on area | Scope | Dynamic-option pool for select features | `scope_id` used in object_id |
|---|---|---|---|
| `Area Provides: <F>` | `area` | `area_entities(this_area)` + entities of `area_devices(this_area)` | `<this_area_id>` |
| `Floor Provides: <F>` | `floor` | union over `floor_areas(this_area's floor)` | `<floor_id_of_this_area>` |
| `Provides: <F>` (bare) | `none` | **entire entity pool** (no scope filter applied) | `<this_area_id>` — entity lives in the area carrying the label, but consumes from the global pool |

Floor-scoped declarations on multiple areas in the same floor are deduplicated by `scope_id` (one floor-wide entity, not one per area).

Matching Option labels on entities follow the same scope-prefix convention:

| Label on entity | Contributes to |
|---|---|
| `Area Provides Option: <F>` | Area-scoped `<F>` features in the entity's area |
| `Floor Provides Option: <F>` | Floor-scoped `<F>` features in the entity's floor |
| `Provides Option: <F>` (bare) | **None-scoped `<F>` features anywhere** (any area carrying bare `Provides: <F>` accepts this entity into its pool) |

`(scope-prefix)Provides <F> Exclude: True` on an entity opts it out at the matching scope.

## Built-in feature catalog (v1)

| FeatureName | Trigger | Component | Generates | Notes |
|---|---|---|---|---|
| `Manifest` | Implicit — one per area in registry | `sensor` | `sensor.area_manifest_<area_id>` | State is `entity_count`; attributes carry `area_id`, `area_name`, `entity_ids`, `device_ids`, `labels` (label → entity-id list, restricted to entities in the area). Mode `always` — refreshes every trigger. |
| `Shoot Zone` | `(Area\|Floor\|)Provides: Shoot Zone` | `sensor` | `sensor.<scope_id>_vpd` | Antoine-equation VPD (kPa, pressure device_class). Pulls temp + humidity sensors from the scope entity set, averages Celsius-converted temps, returns `unavailable` if either side is empty. |
| `Root Zone` | `(Area\|Floor\|)Provides: Root Zone` | `number` | `number.<scope_id>_tracked_psi` | 0–2000 PSI by default, step 0.1, mode `box`, optimistic. Initial state 0 with `initialize_mode: set_if_missing` so user-edited values survive re-publishes. |
| `<UserDefined>` | `(Area\|Floor\|)Provides: <UserDefined>` and/or `(Area\|Floor\|)Provides Options: <UserDefined>: a\|b\|c` | `select` (overridable via `Provides <F> Component:`) | `select.<scope_id>_<slug(F)>` | Options resolved from entity `Provides Option:` labels, static `Provides Options:` labels, or both combined (static first, dynamic appended). |

When `Provides <F> Component:` overrides the default for a user feature, the script publishes a generic discovery payload for the chosen component (`number`/`switch`/`text`/`sensor`/`binary_sensor`). `number` honors `Provides <F> Min:` / `Max:` / `Step:` labels with sensible defaults (0/100/1).

## Label catalog (Area Based)

**On areas:**

```
(Area |Floor |)Provides: <FeatureName>                                  # create the feature
(Area |Floor |)Provides Options: <FeatureName>: <v1>|<v2=label2>|<v3>   # static options for a select
(Area |Floor |)Provides <FeatureName> Initial: <value>                  # initial state
(Area |Floor |)Provides <FeatureName> Icon: mdi:foo                     # icon override
(Area |Floor |)Provides <FeatureName> Component: <component>            # override default component (select)
(Area |Floor |)Provides <FeatureName> Min: <number>                     # number component
(Area |Floor |)Provides <FeatureName> Max: <number>                     # number component
(Area |Floor |)Provides <FeatureName> Step: <number>                    # number component
(Area |Floor |)Provides <FeatureName> Unit: <string>                    # unit_of_measurement
(Area |Floor |)Provides <FeatureName> Device Class: <string>            # device_class
```

**On entities (for select-feature option pools):**

```
(Area |Floor |)Provides Option: <FeatureName>                           # contribute to the pool
(Area |Floor |)Provides Option <FeatureName>: <custom_dropdown_label>   # override displayed label
(Area |Floor |)Provides <FeatureName> Exclude: True                     # opt out of the pool
```

## Static + dynamic option pools
Three ways to populate a select's options, combinable:

1. **Pure dynamic** — only `Provides: <F>` on the area. Options = entities labeled `(scope-prefix)Provides Option: <F>` in scope. Custom display labels via `(scope-prefix)Provides Option <F>: <label>` on the entity. Falls back to `friendly_name` if no override.
2. **Pure static** — only `Provides Options: <F>: a|b|c` on the area. (Implies `Provides: <F>` if not also declared.) Pipe-delimited; `value=label` form supported (`Provides Options: Mode: all=All|none=None|presence=Area Presence`).
3. **Combined** — both labels present. Static options first, dynamic entities appended.

The pipe delimiter (`|`) was chosen because label values can contain commas (friendly names). Whitespace is trimmed around each segment.

## Deletion semantics
When a `Provides:` label is removed from an area (or the area itself is deleted), the next `areas` attribute change will reflect that the corresponding `expected` triple has disappeared. The diff in `automation.labeled_feature_areas` puts that triple in the `removed` list, which calls `script.labeled_feature_entities` with `delete: true`. That publishes an **empty retained payload** to `homeassistant/<component>/<object_id>/config` — the standard MQTT discovery retract — and HA tears the entity down on the next discovery scan.

Renaming a feature (e.g. `Audio Mode` → `Speaker Mode`) appears as one remove + one add in the same trigger, dispatched in that order, so the old discovery topic is retracted before the new one publishes.

## Adding a new built-in area feature
1. Add a `choose:` branch to `script.labeled_feature_area` keyed on the new feature name. The branch must:
   - Compute its canonical `_obj` (object_id) **first**.
   - Short-circuit on `_delete` immediately after — call `script.labeled_feature_entities` with `delete: true` and `stop:`. Skipping this step or placing it after any label-resolution work will cause delete dispatches to fall through into the create path's error branches (the labels that drive resolution are already gone by the time the diff fires).
   - Only after the short-circuit, run any feature-specific label resolution and call `labeled_feature_entities` to publish the discovery payload.
2. Document the new feature in the catalog table above.
3. **No sensor changes required** — the sensor's `label_map` already exposes every `(scope_id, label)` pair with `component: select` by default. If the new feature needs a non-`select` default component, a `(Area |Floor |)Provides <Label> Component: <comp>` modifier label on the declaring area covers it without touching the sensor.
4. **No automation changes required** — `labeled_feature_areas` is feature-agnostic and routes everything through the script.

User-declared features that just need a different component don't need any of the above — the `Provides <F> Component:` label routes through the generic component branch and uses sensible defaults.


{{< examples title="Example labels" >}}
