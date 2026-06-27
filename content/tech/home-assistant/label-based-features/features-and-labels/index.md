---
title: Features & Labels
type: docs
weight: 20
---

For many features, there are usually 1-3+ labels required. One for the name and to dynamically group the entities into leaders and followers, and then additional labels to pass options and enable specific behaviors. This section aims to contain all the label values used and how to work with them.

## Use Cases
In practice, the non-script base labels gets me to 80% of the functionality I'm after. 
They support:
- Turning on a fan when I open my door
- Turning on a screen when an idle sensor decreases
- A door sensor closing leads setting House Mode to Night
	- With a separate feature, House Mode to Night enables the night_mode switch follower to turn the floor into night mode. 
- That night mode sensor is in turn a leader for many entities that turn on, off, or adjust brightness or volume as a follower. 
	- TV
	- Laptop brightness
	- Lights
	- Audio levels

But when followers need to reference more than one state or otherwise have complex logic, they can be configured to run custom scripts, automations, and scenes. I use these to suppport:
- Buttons
  Dynamic media & home controls based on area, and the status of 2 features: media-playing and night.
  
- Whole Home Audio 
  Un-mutes audio when presence is detected in a room.
  Set's snapclient's Stream selection based on mode.

- Per-area / per-floor selectors
  An `Area Provides: Audio Mode` label on the kitchen area auto-creates `select.kitchen_audio_mode` with options pulled from media players in the kitchen (or static options declared by `Area Provides Options: Audio Mode: All|None|Area Presence`). The same label on every area on the first floor — but with the `Floor Provides:` prefix — creates a single `select.first_floor_audio_mode` (deduped by floor scope).

- Per-area calibrated values
  An `Area Provides: <ProbeName> Component: number` label and `Area Provides <ProbeName> Min: 0` / `Max: 100` / `Step: 0.1` labels on the area generate a number entity for the user to dial in a calibration target without writing any YAML.

- VPD and tracked PSI for grow spaces
  Tagging an area `Area Provides: Shoot Zone` auto-creates `sensor.<area_id>_vpd` (Antoine-equation, pulls temp + humidity sensors from the area). `Area Provides: Root Zone` creates `number.<area_id>_tracked_psi` (set-if-missing initial 0, optimistic, 0–2000 range).

## Label Placement

### Labels on Entities
Labels are used to target individual entities, thus can't go on the device. 
### Labels on Buttons
Because buttons use events by default they don't have entities. With buttons provided by Zigbee2Mqtt, use `experimental_event_entities: true` ([docs](https://www.zigbee2mqtt.io/guide/configuration/homeassistant.html)) to enable an entity per device that has it's state as the last received event. This can be used with string selection for features to run scripts or actions.
### Labels on Areas and Floors
Most features have an area or floor based filter. Not all of them will need an area or floor label though! It's really only needed for features that aren't built on existing entities. It's primarily used to generate new entities in an area based on labels - functionality not yet supported or documented. 
### Areas go on devices
This area will automatically get applied to entities belonging to the device (unless manually overridden), so it makes the most sense to apply the area on the device.

---

## Mandatory Labels
These are minimum labels needed in order to implement a leader/follower feature. 

### Leader Label
In order to support real time triggers, ALL leaders have to have the following label
```
Feature Leader
```


### Grouping / Scope Labels
Every entity in a leader/follower(s) setup should have a label that defines what group(s) it belongs to. One label per feature group.
```
(Area |Floor |)(Leader|Follower): FEATURE_NAME_HERE
```
Area |Floor |:  defines that scope of filtering.
Leader|Follower: should reflect the entities role.
FEATURE_NAME_HERE: Is the user defined feature name.


---
## Provides Labels
`Provides:` is a single concept that means two different things depending on
where the label lives — and they share a name on purpose, so the system
ends up with one consistent vocabulary instead of two.

| Where label lives | What it means | Example |
|---|---|---|
| On an **entity** | "This entity provides feature X" — adds it to the follower set for every generic feature in X's catalog (Leader/Follower, Generics, Somrig) | `Provides: Media Player` on `media_player.tv_room_audio` |
| On an **area** | "This area provides feature X" — generates an MQTT-discovery entity for X in that area's scope (Area Based Features) | `Area Provides: Audio Mode` on the `kitchen` area |

Both contexts use the same scope-prefix rules as everything else
(`Area ` / `Floor ` / bare), and both honor `Exclude: True` for opt-outs.
The template sensor distinguishes the two contexts by where the label was
found: `labels(<entity>)` vs `labels(<area_id>)`, so there is no collision
risk between provider category names (Media Player, Light, Fan…) and
area-feature names (Audio Mode, Shoot Zone, Root Zone…).

> ⚠️ **Disambiguation is by location, not by name.** The same string
> (`Provides: Media Player`) is legal in *both* contexts and means
> different things depending on where it lives:
>
> - On an **entity** — entity-context. The label is a domain-grouping
>   shorthand only; it **never** generates an MQTT-discovery entity. It
>   opts the entity into every generic feature whose `domain_label`
>   matches (see the resolution algorithm below).
> - On an **area** — area-context. The label **always** generates an
>   MQTT-discovery entity for that area (the whole point of the Area
>   Based Features stack). `Provides: Media Player` on `area.bedroom_main`
>   creates `select.bedroom_main_media_player` (an area-scope dropdown of
>   the media players in that area). This is intentional — even though
>   the name overlaps with the domain-grouping shorthand, when the label
>   is on an area it is unambiguously an area-feature declaration.
>
> If you want a domain-grouping name (e.g. `Media Player`) to *not* turn
> into an area-scope select when applied to an area, simply don't put it
> on the area. The two namespaces are intentionally separate by location.

### Entity-context: domain provider grouping
When `Provides:` lives on an entity, the consumer scripts treat it as a
shorthand for "this entity participates in every generic feature whose
domain matches this label." There is no separate catalog attribute on the
state sensor — each generic feature carries its own `domain_label` in
`labeled_feature_generics`' `feature_meta` lookup, and that label is the
single thing the resolver looks up.

| Provider label | Implicit domain | Features it opts the entity into |
|---|---|---|
| `Provides: Media Player` | `media_player` | `Media Toggle`, `Media Play`, `Media Pause`, `Media Next`, `Media Previous`, `Media Seek Back`, `Media Seek Forward`, `Volume Up`, `Volume Down` |
| `Provides: Light` | `light` | `Lights On`, `Lights Off`, `Lights Up`, `Lights Down` |
| `Provides: Fan` | `fan` | `Fan On`, `Fan Off`, `Fan Up`, `Fan Down` |

Adding a new domain grouping is a single edit: set the `domain_label` field
on every entry in `feature_meta` that belongs to it, and the
`(Area |Floor |)Provides: <NewLabel>` shorthand starts working for those
features — no template sensor changes required.

#### Resolution algorithm (entity context)
Every generic-feature consumer (`labeled_feature_generics`,
`labeled_feature_somrig`'s `media_playing` check, the Provides-aware select
branch in `labeled_feature_area`) runs the same **4-step Provides resolver**
twice — once with the feature name itself, once with the feature's
`domain_label` — and unions the results:

```
resolve_provides(label, scope_prefix):
  try in order, return first non-empty:
    1. label_entities(label)                              # exact (global)
    2. label_entities(scope_prefix ~ 'Provides: ' ~ label)
    3. label_entities(scope_prefix ~ 'Follower: ' ~ label)
    4. label_entities(scope_prefix ~ 'Leader: '   ~ label)
  Candidates 2–4 are filtered to the scope entity set;
  candidate 1 is never scope-filtered.
```

The final `label_targets` for a feature dispatch is:

1. `resolve_provides(<Feature>, scope_prefix)` ∪
   `resolve_provides(<domain_label>, scope_prefix)` (when defined)
2. Minus entities labeled `<Feature> Exclude: True`,
   `<scope_prefix><Feature> Exclude: True`, and the same pair for
   `<domain_label>` when defined.

A single `Area Media Player Exclude: True` therefore opts an entity out of
every media-player generic feature dispatched into the area (Volume, Seek,
Play/Pause, Next/Prev) — the right thing for a "this speaker should never
participate in the area's media controls" case.


#### Example: configure a media player as an area follower
Old way — one label per feature on the entity:
```
Area Follower: Media Toggle
Area Follower: Media Pause
Area Follower: Volume Up
Area Follower: Volume Down
Area Follower: Media Next
Area Follower: Media Previous
Area Follower: Media Seek Forward
Area Follower: Media Seek Back
```

New way — one label, every media-player feature wired in:
```
Area Provides: Media Player
```

The same shape works for `Provides: Light` (replaces 4 `Lights *` follower
labels), `Provides: Fan` (replaces 4 `Fan *` follower labels), etc.

### Area-context: generated entities
When `Provides:` lives on an area, it triggers the **Area Based Features**
stack (see that section below for full details).

The full set of area-context `Provides` labels is documented in the
**Area Based Features → Label catalog** section below. In short:

```
(Area |Floor |)Provides: <FeatureName>                # create the feature
(Area |Floor |)Provides Options: <F>: a|b|c           # static options for select
(Area |Floor |)Provides <F> Component: <component>    # override default component
(Area |Floor |)Provides <F> Initial: <value>          # initial state
(Area |Floor |)Provides <F> Icon: mdi:foo             # icon override
(Area |Floor |)Provides <F> Min/Max/Step/Unit/Device Class: <…>
```

…and on entities (to contribute to a select feature's option pool):

```
(Area |Floor |)Provides Option: <FeatureName>
(Area |Floor |)Provides Option <FeatureName>: <custom_label>
(Area |Floor |)Provides <FeatureName> Exclude: True
```

---
## Optional Labels
These define additional functionality that can optionally be applied via labels. They will all roughly be formatted like `FEATURE_NAME_HERE LABEL_FUNCTION: variables/options/args`

``` Examples
(Area |Floor |)FEATURE_NAME_HERE (Enable|Disable): A_STRING_HERE
(Area |Floor |)FEATURE_NAME_HERE Only: (Disable|Enable)
(Area |Floor |)FEATURE_NAME_HERE Invert: (False|True)
(Area |Floor |)FEATURE_NAME_HERE Decreasing|Increasing: True
(Area |Floor |)FEATURE_NAME_HERE (|Not )Between: <a_24_h_format_time>:<a24_h_format_time>
(Area |Floor |)FEATURE_NAME_HERE Toggle: True
(Area |Floor |)FEATURE_NAME_HERE Exclude: True

(Area |Floor |)FEATURE_NAME_HERE (Enable|Disable) Script: script.NAME_OF_SCRIPT_TO_CALL
(Area |Floor |)FEATURE_NAME_HERE (Enable|Disable) Arg FIELD_NAME: %
(Area |Floor |)FEATURE_NAME_HERE Script: script.NAME_OF_SCRIPT_TO_CALL
(Area |Floor |)FEATURE_NAME_HERE Arg FIELD_NAME: %

(Area |Floor |)FEATURE_NAME_HERE Error Mode: (Silent|Log|Alert|Stop)
```

> [!NOTE] Scope Prefix Required
> All optional labels (Enable, Disable, Only, Invert, Between, Not Between, Increasing, Decreasing, Toggle, Script, Arg, Error Mode) **must include the same scope prefix as the grouping label**. If the entity has `Area Follower: Fan` or `Area Leader: Fan`, then all optional labels for that feature must start with `Area Fan:` — e.g. `Area Fan Toggle: true`, `Area Fan Only: Enable`, `Area Fan Enable: 75`. The bare feature name (without prefix) is still what gets passed to scripts via the `feature` field.
Most of them apply to both leaders and followers with slightly different functionality.


### Shared label functions (Leaders and Followers)
Most labels below apply to both leaders and followers with the same shape; rows that are leader-only or follower-only are flagged in the Notes column. **Scripts, Features, Args, and the Tag mechanic** are described in their own section under "Running Custom Scripts, Automations, and Scenes" → **The Dispatch Loop** below; this table is just the gate/filter labels.

| Label Function           | Value / Arg                                         | Function                                                                                                                                                                                                                                                                | Notes                                                                                                                                                                                           |
| ------------------------ | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enable \| Disable        | A_STRING_HERE<br><br>Arg required                   | **Leader:** when the leader's state matches A_STRING_HERE, the feature is triggered as Enabled; when it changes off that value it triggers as Disabled.<br><br>**Follower:** when triggered and `leader_enabled` matches the qualifier, the follower's implicit feature action sets the entity to A_STRING_HERE. Often used in pairs when different values are needed per direction. | Leader: doesn't fire Disabled when the previous value didn't match either. Follower: handled by the implicit `feature` action item in the dispatch loop.                                       |
| Only                     | Enable\|Disable<br><br>Default: None/both           | Filters the action list to only fire when `leader_enabled` matches. When applied to both a leader and a follower for the same feature, **both** filters apply.                                                                                                          |                                                                                                                                                                                                 |
| Invert                   | True\|False<br><br>Default: False                   | **Leader:** inverts the `leader_enabled` value passed to followers.<br><br>**Follower:** inverts the action — leader_enabled=true becomes "set Disable value" / "turn off" and vice versa.                                                                              | Invert on a leader modifies the trigger; on a follower it modifies the action.                                                                                                                  |
| Decreasing \| Increasing | True<br><br>Default: False                          | **Leader only.** Evaluated by the Labeled Features State template sensor. Compares numeric `current_value` vs `previous_value`. `Increasing: True` → `enabled = (current > previous)`; `Decreasing: True` → `enabled = (current < previous)`. Both may be present (OR). Non-numeric / first update → `enabled = false`. **Direction takes precedence over `Enable:`/`Disable:` labels.** `Invert: True` still applies *after* Direction.<br><br>The sensor always tracks real values regardless of direction; the automation then gates dispatch via `leader_should_proceed` (Direction-labeled feature with `leader_enabled == false` → no dispatch). | Doesn't make sense on a follower.                                                                                                                                                               |
| (\|Not )Between          | (<24_h_fmt>\|-):(<24_h_fmt>\|-)<br><br>Arg required | Time-of-day gate. Only runs if the current time matches one of the provided ranges. An open end is `-`. Multiple Between labels are OR'd; multiple Not Between labels are OR'd as exclusions.                                                                            |                                                                                                                                                                                                 |
| Toggle                   | True<br><br>Default: False                          | **Leader:** bypasses Only / Increasing / Decreasing filters (Between / Not Between still apply). Passes `toggle: true` to every dispatched follower so they toggle their current state. Invert on the leader still applies to `leader_enabled`, but the follower ignores `leader_enabled` when toggling.<br><br>**Follower:** toggles the entity's current state. Direct-value labels (`Enable:`, `Disable:`, bare `FEATURE:`) are skipped in the implicit feature action. Script and Extra Script items still run and receive `toggle: true` as a std field. For domains without toggle support Error Mode handling applies. `media_player` falls back to mute-toggle if on/off is not supported. `lock` uses `lock.lock`/`lock.unlock` based on current state. | Per-override (`FEATURE_NAME Toggle: true`) is also honored when feature overrides are active.                                                                                                  |
| Error Mode               | (Silent\|Log\|Alert\|Stop)                          | Per-feature override of how the dispatch loop handles errors raised by script / feature action items for this feature. Tiers:<br>- **Silent** — skip silently<br>- **Log** — log to HA log and continue<br>- **Alert** — `script.send_alert` and continue<br>- **Stop** — log + halt this feature's action loop (other features still run).<br><br>Built on HA's native `continue_on_error: true` flag plus a manual `stop: error: true` for the Stop tier. | A leader-level Error Mode applies to its own dispatch (including the script call into `labeled_feature_follower`); a follower-level Error Mode applies to its own dispatch loop (and overrides the leader's value for that follower's calls). The automation itself also supports a top-level `Error Mode:` label as the global default. |
| Exclude                  | True<br><br>Default: False                          | **Follower only.** Opts the entity **out** of `labeled_feature_generics` resolution for the named feature (`(Area \|Floor \|)FEATURE_NAME Exclude: True`). Used primarily to remove specific entities from the **domain fallback** (e.g. exclude one bulb from the area-wide `Lights Off`). No effect when explicit `(Area \|Floor \|)Follower: <Feature>` labels are present. | Only consulted by `labeled_feature_generics`; the standard Leader → Follower flow does not look at this label. |

> [!NOTE] Note
> FEATURE_NAME (Enable|Disable): A_STRING

### Default truth function (when no Enable/Disable/Direction label is set)

When a leader carries `(Area |Floor |)Leader: <F>` but **no** `<F> Enable:` / `<F> Disable:` / `<F> Increasing:` / `<F> Decreasing:` label, the Labeled Features State sensor falls back to a default truth function for `enabled`. Two rules are OR'd:

1. **State equals the feature name (case-sensitive).** This is the lightweight default for option-style leaders. If the leader's state string is exactly `<F>`, `enabled = true`. This is why `input_select.house_mode` carrying just `Leader: Night` works as expected — when the selector is on `"Night"`, the `Night` feature is enabled; on `"Day"` or anything else it is not. Per the case-sensitivity rule for label keywords and feature names, the comparison is exact (not case-insensitive) — `Leader: Night` requires the option to be exactly `Night`, not `night` / `NIGHT`.
2. **State is a generic truthy value.** Covers boolean leaders (`switch`, `binary_sensor`, `input_boolean`, `device_tracker`, …). The truthy set is `on`, `true`, `home`, `open`, `detected`, `active`, `unlocked` (compared case-insensitively).

`event` and `button` domains always evaluate to `enabled = true` because their entities don't carry persistent boolean state — every change is a "fire".

`Invert: True` still applies *after* the default rule, just like with Direction.

If neither rule fits the leader's state model (e.g. a `sensor` whose value is a number and you want a specific value to count as "enabled"), use `(Area |Floor |)<F> Enable: <value>` to pin the truth function explicitly.


## Automation Labels
Labels can be used to change the way the automation runs too! Currently `Error Mode` and `Script Call Mode` are supported.

### Error Mode (on the automation)

```
Error Mode: (Silent|Log|Alert|Stop)
```

applied to the Labeled Leader Automation sets the default Error Mode. It is overridden by Error Mode labels on a Feature at the Leader level.

### Script Call Mode (on `sensor.labeled_features_state`)

```
(Area |Floor |)FEATURE_NAME Script Call Mode: (Blocking|NonBlocking)
Script Call Mode: (Blocking|NonBlocking)
```

Controls whether the leader automation **awaits** the `script.*` action items it dispatches.

- **Blocking** (default) — the `script.*` ref is invoked directly. The leader automation's outer `for_each` iteration awaits the script's completion before moving on. This preserves the historical behavior and is the right choice when downstream work depends on the script having finished.
- **NonBlocking** — the script is invoked via `script.turn_on`, which fire-and-forgets when the target script's mode is `parallel` or `restart`. Required for long-running scripts (e.g. `labeled_feature_sleep_timeout`'s 15-minute fade) so they don't block the leader automation's queued iteration and stall every other feature dispatch for the duration of the script.

Labels live on the `sensor.labeled_features_state` entity (not the leader entity, not the automation). The resolver tries each prefix in turn and uses the first match found:

1. `<scope_prefix><F> Script Call Mode: <X>` — per-feature, scoped (`Area Sleep Timer Script Call Mode: NonBlocking`)
2. `<F> Script Call Mode: <X>` — per-feature, unscoped (`Sleep Timer Script Call Mode: NonBlocking`)
3. `Script Call Mode: <X>` — sensor-wide default
4. Hardcoded fallback: `Blocking`

The same resolver runs on `script.labeled_feature_follower`, so cross-feature script dispatches from followers honor the same mode. `automation.*` and `scene.*` refs are unaffected — they're always invoked directly (the underlying actions are already fire-and-forget on the trigger side). Safe only for scripts whose `mode:` is `parallel` or `restart`; `single`/`queued` scripts still block via `script.turn_on`.


> [!NOTE] Implementation Note
> The Stop/Continue distinction in Error Mode is built on HA's native `continue_on_error: true` action flag. In the current implementation, `continue_on_error: true` is used for all error modes (HA YAML does not support templating this flag dynamically). For `Stop` mode, the error is captured and a manual `stop: error: true` is called immediately after - achieving the same halting behavior while also allowing any log/alert actions to execute first. For `Silent`/`Log`/`Alert` modes execution continues after the error is handled. The Silent/Log/Alert tiers layer on top by suppressing, logging, or notifying about the error accordingly.


{{< examples title="Example labels" >}}
