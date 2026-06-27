---
title: Theory
type: docs
weight: 10
---

There are TONs of ways to write automations in Home Assistant, and I've tried most of them! Unfortunately the majority of them are brittle or require too much maintenance. After lots of experimenting and a career working with software, these are my suggestions as far as how features in Home Assistant should be written, as well as the functions I currently have written. 

## Acceptance Criteria
The most maintainable, scalable, and dynamic approach to handling automations in Home Assistant is to utilize labels and areas/floors together. The idea is that you should be able to configure a device's area and it's entities' labels, and _everything should just **work**._ If an approach can't support this, it's discarded.

> [!WARNING] Labels Are Case-Sensitive
> All label matching in this system is **case-sensitive**. The standard practice is:
> - **Feature names** should be capitalized (e.g. `Screen`, `Fan`, `Night`, `Shoot Zone`, `Root Zone`, `Manifest`) — they must match exactly between the grouping label (`Area Leader: Screen`, `Area Follower: Screen`, `Area Provides: Audio Mode`) and all optional labels (`Area Screen Only: Enable`, `Area Screen Decreasing: True`, `Area Provides Audio Mode Initial: All`).
> - **Boolean values** must be capitalized: `True` and `False` (not `true` / `false`). The matchers look for exactly `True` / `False`.
> - **Label keywords** (`Toggle`, `Invert`, `Increasing`, `Decreasing`, `Only`, `Between`, `Not Between`, `Enable`, `Disable`, `Script`, `Arg`, `Error Mode`, `Provides`, `Provides Option`, `Provides Options`, `Provides Initial`, `Provides Icon`, `Provides Component`, `Provides Min`, `Provides Max`, `Provides Step`, `Provides Unit`, `Provides Device Class`, `Provides Exclude`) are also case-sensitive and should be capitalized as shown in the examples throughout this document.
> 
> A label like `Area Screen Decreasing: true` (lowercase `t`) will **not** be detected — it must be `Area Screen Decreasing: True`.

### Leader and Follower Pattern
The pattern I've found to support that the best is that of labeling leader and followers in an area. That is, one or more entities are identified as a "leader" for the function in it's area or floor. When that leader's state changes, a script runs and similarly updates the labeled followers in the area or floor of the leader who's state changed.

### Limitations of Labels
While labels in Home Assistant have been a HUGE step forward it terms of usability, they're still missing some UI functionality that makes using them for this purpose slightly painful but manageable. The main issue is that the automation UI doesn't have a good way to target labels, especially as triggers. The [Purpose-specific triggers and conditions](https://www.home-assistant.io/blog/2025/12/03/release-202512/#purpose-specific-triggers-and-conditions) functionality will help with this significantly, especially as the project matures. 

Until then, the main way of scripting against labels and areas is to utilize templates heavily as those can perform complex logic with both labels and areas.

Another limitation of labels is that the history isn't tracked in Home Assistant. This works fine in many cases, but if a label's value needs to be recorded, a better approach is to generate an MQTT sensor and reference that instead of the label as that value will be tracked.

Finally, Labels are shared between entities. So avoid updating labels unless you KNOW no other entities are using that value. It's a recipe for pain, so my best practice is to just create new labels when new values are needed.

### Shareable
Because everything is native to Home Assistant and there isn't a need to customize scripts or configs, these automations are unusually shareable. All it takes is having desired blueprint(s) installed, putting your devices in areas and applying the desired labels. 

Labels help in a couple of major ways. For one they allow us to use a generic method to get desired entities. This does add a little up front effort on the scripting side, but the payoff is maintenance free scripts; even with hardware changes. The other major benefit they provide is that with a touch more complexity, we're able to accept and use dynamic values from the labels themselves. This is the crux of being able to automation features with labels vs having to write scripts to automate - though it supports running scripts based on the label for even more customization if that's required too! 

Similarly because it's all Home Assistant script and automation based, the hope is it's easy for newcomers to jump in and start making contributions without having to understand python or how the Home Assistant code is structured. 

#### Limitations of Blueprints
They're great for sharing, but after years still don't have an official way to track and update blueprints. I use the community script to update all the Blueprints at once. It's not perfect, but does the job well enough for now. 

The other potential drawback to blueprints is that they _aren't_ automations or scripts, but a wrapper around. We'll see how that transition plays out in practice. 

It may also make sense to just convert this logic to python and host it on HACS and sidestep the blueprint nonsense. I'd support it if someone wanted to make that transition, though it's more work than I'm willing to tackle alone. My hope is should that time come, this documentation can be used to define how that'll function as well.


### What blueprints are necessary 
One of the limitations of blueprints are that you can only have 1 object per blueprint. That means in order to get this functionality working, you need to install blueprints for the following:
- Labeled Feature State (Trigger-Based Template Sensor)
	- Reacts to state changes on entities labeled `feature_leader`, and the manual-override event `labeled_feature_set` (see **Manual Overrides** below).
	- Maintains these attributes on the sensor: `feature_meta`, `leaders`, `features`.
		- `feature_meta` - single source of truth catalog of the built-in generic features. Each entry is keyed by canonical Feature Name and carries `{ domain, kind, domain_label }`. `domain` is the HA domain used as a fallback target pool (e.g. `media_player`, `light`, `fan`); `kind` is the internal action key consumed by `labeled_feature_generics`' `choose:` block; `domain_label` is the human-readable provider grouping consumed by the `Provides: <DomainLabel>` entity-context shorthand (so a single `Area Provides: Media Player` opts an entity into every media feature). Adding a new domain grouping is a one-line edit here.
		- `leaders` - keyed by entity_id: `{ current_value, previous_value, last_changed_timestamp }`. Diagnostic and substitution surface — read it from arg substitutions when you need a raw value, a previous value, or a timestamp from the leader that triggered the tick.
		- `snapshots` - generic persisted-state surface for long-running scripts. Keyed by `snapshot_name` (a short script-chosen identifier, e.g. `sleep_timeout`) → an arbitrary mapping payload. Writes go through `script.labeled_feature_generics` with `feature: Set Snapshot` (see below) which fires the `labeled_feature_snapshot_set` event; the sensor merges the payload into this attribute on the next tick. Used by `script.labeled_feature_sleep_timeout` (snapshot of per-target volume that survives `mode: restart`) and available to any other script that needs the same affordance.
		- `features` - the first-class observable. Nested by `feature → scope → scope_id → entry`. `scope` is one of `area`, `floor`, `global`. `scope_id` is the area_id / floor_id / `''` for global. Each entry:
			```
			{
			  enabled: bool,                # resolved per-mode (Leader/Any/All)
			  mode: 'leader' | 'any' | 'all',
			  last_changed_timestamp: float, # only bumped when `enabled` flips
			  triggering_leader: str         # entity_id of the leader that drove this tick; '' for manual overrides
			}
			```
		- Example shape:
			```
			features:
			  Night:
			    floor:
			      first_floor:
			        enabled: true
			        mode: all
			        last_changed_timestamp: 1234567890.0
			        triggering_leader: input_select.house_mode
			    global:
			      '':
			        enabled: true
			        mode: leader
			        last_changed_timestamp: 1234567890.0
			        triggering_leader: binary_sensor.front_door
			  Screen:
			    area:
			      tv_room:
			        enabled: false
			        mode: leader
			        last_changed_timestamp: 1234567000.0
			        triggering_leader: sensor.tv_room_idle
			```
	- Resolution modes per `(feature, scope, scope_id)` triple, configured via a label on the sensor entity itself:
		- `<Scoped F> Mode: Leader` (default) — `enabled` reflects only the leader that drove the current tick. Other leaders mapped to the same triple are ignored for this evaluation.
		- `<Scoped F> Mode: Any` — `enabled` is the OR over the most recently known evaluation of every leader mapped to the same triple. Useful for "any door open → Open Door is true".
		- `<Scoped F> Mode: All` — `enabled` is the AND over every leader mapped to the same triple. Useful for "every door closed → Closed House is true".
		- The label keyword is case-sensitive (`Leader`, `Any`, `All`) and the scope prefix matches the leader's: `Floor Night Mode: All`, `Area Screen Mode: Any`, `Night Mode: Leader` (global).
	- Per-leader evaluation (Direction, Enable/Disable, default truth, Invert) happens inside the sensor. Its output feeds the per-triple `enabled` computation per the feature's mode.
	- Features whose label set no longer maps any leader (the user removed every `Leader: <F>` label) are dropped from `features` on the next state-changed tick without further action. Manual-only entries (`triggering_leader: ''`) are not dropped — they were sourced from the override event, not a leader's labels.
	- `unique_id` to enable entity registry features, UI customization (rename, disable), and stable entity identity across reloads.
- Labeled Feature Leaders (Automation)
	- Reacts to `sensor.labeled_features_state.features` and walks the diff of `(feature, scope, scope_id)` entries that actually changed.
	- Trigger: `state` on `sensor.labeled_features_state`, `attribute: features`. The automation diffs `trigger.from_state.attributes.features` against `trigger.to_state.attributes.features` to find every entry whose `enabled` or `triggering_leader` changed.
	- For each changed entry, the dispatching leader is `entry.triggering_leader`. For manual overrides (empty `triggering_leader`) the leader-label parsing is skipped and only the implicit feature dispatch fires (so manual sets always fan out to followers regardless of what the labels would have said).
	- Runtime-only filters (Only, Between / Not Between, Toggle) are applied against `triggering_leader`'s labels — `Between`/`Not Between` use `now()`, which is only available at trigger time.
	- Direction (`Increasing`/`Decreasing`) is evaluated in the sensor, not the automation. The sensor's per-leader projection step computes the leader's `enabled` based on numeric current vs previous; that flows into the per-triple resolution per the feature's mode.
	- The implicit `feature` action item produced by the dispatch loop fans out to followers — for each follower resolved by the feature's `(Area |Floor |)Follower: <F>` / `(Area |Floor |)Provides: <DomainLabel>` labels in the entry's scope, the loop calls `script.labeled_feature_follower` once. The scope passed to the follower comes from the entry.
	- Use `mode: queued` so that rapid or simultaneous changes are all processed sequentially.
- Labeled Feature Follower (Script)
	- This is ran by the automation, but because the leader values are passed into the script, you can also run this by hand against individual followers (useful for testing).
	- It accepts:
		- follower_entity_id (mandatory)
		- feature (mandatory)
		- leader_enabled boolean (mandatory)
		- toggle boolean (optional, default false) — when true the follower toggles its current state; passed automatically by the leader when `Toggle: true` is detected, or can be set manually for testing
		- leader that triggered (optional)
		- scope (area, floor, none) (optional)
		- scope_id - the resolved area_id or floor_id that corresponds to the scope (optional, passed automatically by the automation)
	- Runs **[The Dispatch Loop](../dispatch-loop/)** against the follower entity's labels for the named feature. The implicit `feature` action item on a follower performs the direct entity action (`light.turn_on`, `select.select_option`, the toggle path, etc.) only when its value differs from the entity's current state.
- Labeled Feature Generics (Script)
	- A *generic feature dispatcher* — it knows nothing about specific button devices. Given a generic feature name (e.g. `Lights Off`, `Volume Up`, `Fan On`, `Night`, …) plus a scope it resolves the right entities in the scope and runs the correct service call against them.
	- Resolution order: explicit `(Area |Floor |)Follower: <Feature>` labels first, falling back to a per-feature default domain (e.g. `light` for `Lights Off`). Both paths honor `<scope-prefix><Feature> Exclude: True` to opt entities out.
	- See **[Labeled Feature Generics](../dispatch-loop/#labeled-feature-generics)** for the full feature catalog, the resolution algorithm, and the `toggle` modifier behavior.
- Per-device Button Mapping Scripts (e.g. `script.labeled_feature_somrig`, `script.labeled_feature_styrbar`, `script.labeled_feature_symfonisk`)
	- Translate a specific button-device family's raw event names (`1_short_release`, `2_double_press`, `brightness_move_up`, `dots_1_long_press`, etc.) plus contextual state (e.g. whether media is currently playing) into one or more calls to `labeled_feature_generics`.
	- One mapping script per button-device family. See **[Button Mapping Scripts](../dispatch-loop/#button-mapping-scripts)**.
- Labeled Feature Areas (Automation)
	- Diffs the `label_map` attribute on `sensor.labeled_feature_areas_state` and dispatches creates / deletes to `script.labeled_feature_area`.
	- Triggers on both `state` (`attribute: label_map`) and `homeassistant.start`. The start trigger re-publishes every current expected discovery payload so MQTT discovery survives a HA restart (idempotent because the discovery topics are retained).
	- Diff algorithm: read `to_state.attributes.label_map` (and `from_state.attributes.label_map` on state triggers) — each entry keyed `<scope_id>||<label>` carries `{ scope_id, label, scope, component, declaring_area_id }`. `added = now - prev`, `removed = prev - now`; entries whose `component` changed show up in both (natural rename semantics). Both adds and removes are dispatched to `script.labeled_feature_area`; removes pass `delete: true` so the script — which owns canonical object_id naming — computes the right topic to retract.
	- Removes run before adds so a component swap retracts the stale discovery topic before publishing the new one.
	- See **[Area Based Features](../area-based-features/)**.
- Labeled Feature Area (Script)
	- Per-feature dispatcher for the Area Based Features stack. Architecturally identical to `labeled_feature_generics` / `labeled_feature_somrig`: a big `choose:` block keyed on feature name. Each branch computes the canonical object_id for that feature, resolves the scope entity pool, and calls `script.labeled_feature_entities` to publish (or retract) the MQTT discovery payload(s).
	- Accepts `delete: bool`. The flag is normalized into a top-level `_delete` variable once, and every `choose:` branch short-circuits on it *before* doing any feature-specific work (option-pool resolution, manifest entity enumeration, etc.). On `_delete = true` the branch calls `labeled_feature_entities` with `delete: true` and stops.
	- Built-in branches: `Manifest` → `sensor.area_manifest_<area_id>`, `Shoot Zone` → `sensor.<scope_id>_vpd`, `Root Zone` → `number.<scope_id>_tracked_psi`.
	- Default branch: any other `Provides: <FeatureName>` declared on an area becomes a `select.<scope_id>_<slug(F)>` whose options are the union of static `Provides Options: <F>: a|b|c` labels and entities labeled `Provides Option: <F>` resolved at the same scope.
	- A `Provides <F> Component:` label on the area overrides the default component (`select`) — useful for one-off `number` / `switch` / `text` / `sensor` declarations. This is the *only* feature-specific knob the sensor sees; everything else is read fresh from `labels(declaring_area_id)` at dispatch.

- Labeled Feature Entities (Script)
	- Generic MQTT-discovery entity creator and retract helper. Builds a discovery payload from named fields (with a free-form `extra` dict for anything not enumerated) and publishes it retained.
	- Lifecycle flags: `delete: true` publishes an empty retained payload to retract the entity. `create_mode` (`always` (default) | `if_missing` | `never`) controls when the discovery config is (re)published — `if_missing` skips when the entity already exists (state not in `unknown`/`unavailable`/`none`); `never` skips the discovery publish entirely so the call only tops up state/attributes.
	- State / attributes seeding: `initialize_mode` (controls `initial_state`) and `attributes_mode` (controls `initial_attributes`) both take `set_if_missing` (default) | `always` | `never`.
	- `component` is constrained to HA's supported MQTT discovery components (a closed dropdown selector); see the [MQTT discovery topic](https://www.home-assistant.io/integrations/mqtt/#discovery-topic) reference for the canonical list.
	- Used by `labeled_feature_area` (and any future area-feature dispatcher). Can also be called directly to one-shot create or retract any discovery entity.


{{< examples title="Example labels" >}}
