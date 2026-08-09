---
title: Running Custom Scripts, Automations, and Scenes
type: docs
weight: 30
author_reviewed: false
editor_reviewed: false
---

When more logic and customization is needed, scripts, automations, and scenes can all be triggered by features. They can be the scripts created by these blueprints, or users can create and use their own. This section documents the shared dispatch model used by both `automation.labeled_feature_leaders` and `script.labeled_feature_follower`, plus how arguments and substitutions work.

> [!NOTE] Note
> Throughout this section I refer to "scripts" generically. The same labels work for `script.*`, `automation.*`, and `scene.*` references — the only difference is that `automation.*` and `scene.*` calls don't accept the `Arg` labels because they don't take variables.

## The Dispatch Loop
**One execution loop, shared between Leaders and Followers.** Both the Leader automation (running against the leader entity's labels) and the Follower script (running against the follower entity's labels) build a single ordered list of *action items* from labels and walk it through one `repeat:`. The only difference between the two contexts is what the implicit `feature` action item does (Leader → fan out to followers; Follower → set the entity's value / toggle / call the resolved domain action).

This eliminates the duplicate code paths the legacy implementation had between leaders and followers, and makes the dispatch order — including custom scripts mixed in with the implicit feature dispatch — completely user-configurable via label tags.

### Step 1 — Sort the features
The list of features active for the entity is sorted **alphabetically by feature name**. This gives deterministic ordering when two features fire simultaneously — e.g. `Day` always runs before `Night`. It's intentionally a simple lexical sort; if you need stricter ordering, name the features to sort correctly (e.g. `Day Enable` < `Night Disable` works out of the box).

### Step 2 — Build the action list per feature
For each feature, the entity's labels are parsed into a list of *action items*. Each item is one of two **kinds**:

- **`script`** — a script, automation, or scene to call. Sourced from these labels:
  - `<F> [Enable|Disable] Script <tag>: <ref>` — **replaces** the implicit feature action (any Script label present causes the implicit feature item to be dropped from the array).
  - `<F> [Enable|Disable] Extra Script <tag>: <ref>` — **adds** to the array without dropping the implicit feature item.
- **`feature`** — a feature dispatch. Sourced from these labels:
  - **Implicit** — one item generated automatically per feature, with the feature name set to `<F>`. Dropped from the array if any `<F> [Enable|Disable] Script <tag>: …` (replacement-style) label is present.
  - `<F> [Enable|Disable] Feature <tag>: <other_feature>` — **replaces** the implicit feature item with one targeting `<other_feature>`. If multiple `Feature` labels are declared they all live in the array, but the implicit one is dropped. Empty value means "the current feature" (`<F>`).
  - `<F> [Enable|Disable] Extra Feature <tag>: <other_feature>` — **adds** a feature item without dropping the implicit one. Empty value means "the current feature" (`<F>`).

`<tag>` is a free-form word placed immediately after the `Script` / `Extra Script` / `Feature` / `Extra Feature` keyword. Labels with no tag are sorted *last* — see Step 3.

> [!WARNING] Tag values must be single words
> Tags are parsed as the single whitespace-separated token following the `Script` / `Extra Script` / `Feature` / `Extra Feature` keyword. **Tags with spaces are not supported** (e.g. `Setup A` is not a valid tag — the parser would treat `A` as the start of the value). If you need multi-word tags, use a separator like `-` or `_` (e.g. `Setup-A`, `setup_a`).

> [!NOTE] Replacement vs Additive
> The `Script` / `Feature` keywords are **replacement-style** — declaring any of them tells the loop "I want to control what dispatches for this state; don't auto-fire the implicit feature." The `Extra Script` / `Extra Feature` keywords are **additive** — they add to whatever the loop was already going to do (which may or may not include the implicit feature depending on whether any non-Extra Script/Feature label is present).

> [!NOTE] `<F>: <state_value>` on Leaders
> On a leader entity, a label of the form `<F>: <state_value>` (no `Script` / `Feature` / `Extra` / `Enable` / `Disable` keyword between the feature name and the colon) is treated as a **shorthand implicit-feature item**. When the leader's `current_value` matches `<state_value>` at trigger time, the loop emits a `feature` action item targeting `<F>` with `leader_enabled = true`. This lets a single button-style leader carry several state→feature mappings without writing explicit `Feature` labels for each one. The shorthand sits with the no-tag, no-variant items in the sort order. Any matching shorthand counts as a "replacement-style" declaration — it drops *that feature's* implicit item the same way an explicit `<F> Script: …` would.
>
> **Scope to the current feature's iteration.** The dispatch loop runs the shorthand resolution *per `(feature, scope, scope_id)` triple being dispatched on the current tick*, and the shorthand item is only emitted into the iteration whose `feature_name` matches the shorthand's target `<F>`. This matters when a single leader carries shorthand labels for multiple features (e.g. `input_select.house_mode` with both `Day: Day` and `Night: Night`, plus `Leader: Day` and `Leader: Night`): on a `Night → Day` transition the sensor flips both triples in the same tick (`Day.global.''.enabled = true`, `Night.global.''.enabled = false`), and the loop runs once per triple. Only the Day iteration sees the `Day: Day` shorthand replacing its implicit item; the Night iteration still sees its own implicit feature dispatch with `leader_enabled = false`. Without this scoping, the shorthand for the currently-active state would suppress the implicit dispatch of every other feature flipping on the same tick (the historical "Night never disables when state goes to Day" bug).

### Step 3 — Sort the action list
Items in the array are sorted:

1. **Primary key — tag** — lexicographic. Labels with no tag sort *last*.
2. **Secondary key — variant** — `Enable` first, then *normal* (no variant qualifier), then `Disable`.

So given:
```
Screen Enable Script Pre:   script.warmup
Screen Script Pre:          script.log
Screen Disable Script Pre:  script.cooldown
Screen Enable Extra Script: script.foo    # no tag → last in its variant
Screen Script:              script.bar    # no tag, no variant
```

After sort:
```
1. Screen Enable Script Pre:   script.warmup    # tag "Pre", Enable
2. Screen Script Pre:          script.log       # tag "Pre", Normal
3. Screen Disable Script Pre:  script.cooldown  # tag "Pre", Disable
4. Screen Enable Extra Script: script.foo       # no tag, Enable
5. Screen Script:              script.bar       # no tag, Normal
(implicit feature item drops here because a Script label is present)
```

### Step 4 — Filter to current state
The sorted array is filtered against the current evaluation:
- `Enable`-variant items are dropped when `leader_enabled` is `false`.
- `Disable`-variant items are dropped when `leader_enabled` is `true`.
- Normal-variant items and the implicit feature item are always kept.

### Step 5 — Execute the loop
A single `repeat:` walks the surviving array. Each iteration:

- **For `script` items** — call the script reference with the resolved args (see "Passing Arguments to Scripts" below). The reference's domain determines dispatch:
  - `automation.*` / `scene.*` → plain `action: <ref>` with no data
  - `script.*` with no args → `action: <ref>` with the std fields dict
  - `script.*` with args → `script.turn_on` with `variables:` so args propagate
  Args validation runs against the target script's declared fields; invalid args trigger Error Mode per the feature's `Error Mode:` label.

- **For `feature` items**:
  - **On a Leader** — resolve the feature's follower set (via the standard `(Area |Floor |)Follower:` + `(Area |Floor |)Provides:` resolver) and iterate `script.labeled_feature_follower` once per follower, passing `follower_entity_id`, `feature`, `leader_entity_id`, `leader_enabled`, `toggle`, `error_mode`, `scope`, `scope_id`.
  - **On a Follower** — run the resolved direct entity action: bare-value via the domain's set-value service, Enable/Disable-value (`<F> [Enable|Disable]: <value>` → set), Toggle (`<F> Toggle: True` → `homeassistant.toggle` / domain-specific variant), or the implicit on/off based on `follower_enabled`. Behaves as a no-op when current state already matches.
  - **No-ref Extra Feature on a follower** is documented as a no-op — the follower's "act on this entity per the feature" semantics don't compose with itself. (Use a real `<other_feature>` ref to dispatch something different through `labeled_feature_generics`, or use Extra Script if you want to layer additional behavior.)

After each iteration, the feature's resolved `Error Mode` (per-feature label → entity / leader → automation default) controls the response:
- `silent` — no-op
- `log` — `system_log.write` at `error`
- `alert` — `script.send_alert`
- `stop` — log + a manual `stop: error: true` halts this feature's action loop (the outer feature loop continues to the next feature).

All call sites use `continue_on_error: true` so error handling is owned by the loop, not by HA's default propagation.

### Step 6 — Continue with the next feature
Errors in one feature's action loop don't stop other features from dispatching — only `Error Mode: stop` halts the current feature's loop, and even then the outer feature loop continues.

## Script / Feature label reference

| Label Function                                  | Format                                                          | Function                                                                                                                                                                                                                                                                            | Notes                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Script                                          | `<F> [Enable\|Disable] Script <tag>: <ref>`                      | **Replacement-style.** Adds a `script` item to the action array; the presence of any `Script` label drops the implicit `feature` item. Variant qualifier (`Enable` / `Disable`) restricts dispatch to the matching state.                                                            | `<tag>` is optional and free-form. Multiple Script labels for the same feature with different tags all sit in the array. `<ref>` is `script.X`, `automation.X`, or `scene.X`.                                                                                                                                                                              |
| Extra Script                                    | `<F> [Enable\|Disable] Extra Script <tag>: <ref>`                | **Additive.** Adds a `script` item without dropping the implicit feature item.                                                                                                                                                                                                       | Use this to layer additional behavior on top of the standard feature dispatch (e.g. log a message in addition to setting a follower's value).                                                                                                                                                                                                              |
| Feature                                         | `<F> [Enable\|Disable] Feature <tag>: <other_feature>`           | **Replacement-style.** Adds a `feature` item targeting `<other_feature>` and drops the implicit feature item. Empty value means "the current feature" (`<F>`).                                                                                                                       | When `<other_feature>` resolves on a follower, it goes through `labeled_feature_generics` for the entity-action mapping. Follower set is resolved per the *referenced* feature's labels, not the current feature.                                                                                                                                          |
| Extra Feature                                   | `<F> [Enable\|Disable] Extra Feature <tag>: <other_feature>`     | **Additive.** Adds a `feature` item without dropping the implicit one. Empty value means "the current feature" (`<F>`).                                                                                                                                                              | On a follower, an Extra Feature with no `<other_feature>` is a documented no-op (acting on the same entity twice). On a leader, the no-ref form simply re-fans the same feature, which is rarely useful but allowed.                                                                                                                                       |
| Arg                                             | `<F> [Enable\|Disable] Arg <tag> <field>: <value>`               | Provides a per-script argument. Args are pooled by tag + variant — every Script / Extra Script item with the same `<tag>` and matching variant receives the same args. The no-tag pool feeds the no-tag items.                                                                       | `<field>` must match a declared field on the target script (or be one of the standard pass-through fields). Invalid fields trigger Error Mode. See "Passing Arguments to Scripts" below.                                                                                                                                                                   |
| (no tag forms)                                  | `<F> [Enable\|Disable] Script: <ref>`<br>`<F> Arg <field>: <value>` | Same as the tagged forms but with no `<tag>` — these sort *last* (after every tagged item).                                                                                                                                                                                          | The no-tag, no-variant form (`<F> Script: <ref>`) is the simplest case and matches the legacy "default script" behavior.                                                                                                                                                                                                                                   |

> [!NOTE] Scope prefix still required
> Like every other optional label, Script/Feature/Arg labels must carry the same scope prefix as the grouping label. `Area Leader: Screen` → `Area Screen Script Pre: script.foo`, not just `Screen Script Pre: script.foo`. The bare feature name (without prefix) is what gets passed to scripts via the `feature` field.

## Passing Arguments to Scripts
Scripts by themselves are helpful, but what really makes them shine is when they have context. The preferred way to get this context into scripts is by passing arguments into fields. The dispatch loop does this by:

- Reading every Arg label for the current feature and variant, keyed by tag. Args bind to the Script / Extra Script items that share their `<tag>` and variant (no-tag args bind to no-tag scripts).
- For each Arg `<field>`:
  - If the target script declares a field by that name, the value (after substitution if dynamic — see below) is added to the call.
  - Otherwise the feature's `Error Mode` is triggered for an invalid arg.
- Additionally, these **standard pass-through fields** are added automatically if the target script declares them (no Error Mode for missing ones — they're assumed optional):
  - `feature` / `leader_feature`
  - `scope` / `scope_id`
  - `follower_entity_id` / `leader_entity_id`
  - `leader_enabled`
  - `toggle` (true when the follower is in toggle mode; scripts that declare a `toggle` field receive it automatically)

### Missing fields & Error Mode
When an Arg's `<field>` isn't declared by the target script, the feature's resolved `Error Mode` controls the response — `silent`/`log`/`alert` log and proceed with the valid args; `stop` halts the loop for that feature.

### Argument Substitutions
Args support a substitution syntax to pull values from `sensor.labeled_features_state`. It works on Arg label values against any attribute on the sensor (`leaders`, `features`, `feature_meta`, anything added later).

Format:
```
<F> [Enable|Disable] Arg <tag> <field>: <attribute>.<dotted.path>
```

Examples:
```
Area Night Buttons Arg feature: leaders.current_value
Area Night Buttons Arg feature: leaders.previous_value
Area Night Buttons Arg enabled: features.Night.floor.first_floor.enabled
Area Night Buttons Arg timestamp: features.Night.global..last_changed_timestamp
Area Night Buttons Arg domain: feature_meta.Lights Off.domain
```

Resolution rules:

1. The value must match `^[A-Za-z_][A-Za-z0-9_]*\.` to be treated as a substitution — anything else is passed through as a literal string.
2. The first segment names a top-level attribute on `sensor.labeled_features_state`. The remaining dot-separated segments walk into that attribute's nested dicts. An empty segment (`..`) is a literal empty-string key — used for `global` scope's `''` scope_id (see `features.Night.global..enabled`).
3. Special case for `leaders`. If the first path segment is not a key already present in the `leaders` dict (i.e. it's not an entity_id like `binary_sensor.front_door`), the parser splices the triggering leader's entity_id in as the first key. So `leaders.current_value` resolves to `leaders[<triggering_leader>].current_value` without having to bake the entity_id into the label.

## Best Practices
When just labels, it's pretty hard to stray from the intended use. With scripts that's a whole different story. Users are welcome to go about scripts anyway they wish (I'm curious to see the possibilities!), but this is a list of practices I try to adhere to when working with scripts.

> [!NOTE] Best Practice
> The script should aim to check the current state and bring it into alignment with what's desired rather than blindly turning things on or off.

> [!NOTE] Best Practice
> Prefer tags over relying on label name to imply order. Even if you only have one script today, giving it a tag (`Screen Script Main: script.foo`) makes it explicit how it'll sort relative to anything added later. The exception is the simplest "just one default" case — leaving the tag off is fine when there really is only one.
---

---


## Button Based Features
Some use cases don't make sense for an environment based trigger but instead are more suited for a button based solution. These can use labels and areas too! They all rely on scripts, so be familiar with the **Running Custom Scripts** section above — in particular the way a replacement-style `Script` label on a leader (with no tag) suppresses the implicit feature dispatch and lets the script take over completely.

The button-based feature stack is split into two layers, with a small shared error-handling helper:

1. **`script.labeled_feature_generics`** — a *generic feature dispatcher*. It knows nothing about specific button devices. Given a generic feature name (`Lights Off`, `Volume Up`, `Media Pause`, `Fan On`, `Night`, …) it resolves the right entities in the scope and runs the correct service call against them.
2. **Per-device mapping scripts** (e.g. `script.labeled_feature_somrig`) — translate a specific device's raw event names (`1_short_release`, `2_double_press`, …) plus contextual state (is media currently playing?) into one or more calls to `labeled_feature_generics`. One mapping script per button-device family.
3. **`script.labeled_feature_error_mode`** — a shared helper used by everything in this stack to dispatch the `silent` / `log` / `alert` tiers of Error Mode. The `stop` tier is intentionally left to each caller because a `stop:` inside the helper would only halt the helper, not its parent.

This split keeps the generic catalog of "things a button could do" in one place, and lets each new device type contribute only the small translation table that's actually device-specific.

### Labeled Feature Error Mode
`script.labeled_feature_error_mode` is the shared Error Mode handler used by `labeled_feature_generics`, the per-device mapping scripts, and any future Labeled Feature script that wants consistent error reporting.

**Fields:**

- `error_mode` (string, default `log`) — `silent | log | alert | stop`.
- `message` (string, required) — human-readable message describing what went wrong.
- `source` (string, default `Labeled Feature`) — short label prefixed onto logs/alerts (e.g. `Labeled Feature Generics`, `Labeled Feature Somrig`).
- `severity` (string, default `medium`) — severity for the `alert` tier.

**Behavior per tier:**

| Tier   | Action                                                                                              |
|--------|-----------------------------------------------------------------------------------------------------|
| silent | No-op.                                                                                              |
| log    | `system_log.write` at `warning` with `"{source}: {message}"`.                                       |
| alert  | `script.send_alert` with `alert_severity: {severity}`, `alert_title: {source}`, `alert_message`.    |
| stop   | `system_log.write` at `error` with the message. **Caller must follow up with its own `stop: error: true`** to actually halt parent execution. |

The caller pattern looks like:

```yaml
- action: script.labeled_feature_error_mode
  data:
    error_mode: '{{ _err_mode }}'
    source: Labeled Feature Generics
    message: "No targets resolved for feature '{{ _feature }}'."
- if:
    - condition: template
      value_template: '{{ _err_mode == "stop" }}'
  then:
    - stop: "Labeled Feature Generics: no targets for '{{ _feature }}'."
      error: true
```

### Labeled Feature Generics
`script.labeled_feature_generics` is called by mapping scripts (or directly) with `feature: <FeatureName>` and runs the matching generic action.

#### Resolution algorithm
For each call, the script resolves a target entity set as follows:

1. **Scope set**: build the candidate set of entities in `scope`/`scope_id`:
   - `area` → all entities in `area_entities(scope_id)` plus entities of all devices in `area_devices(scope_id)`
   - `floor` → union of the above across all areas in `floor_areas(scope_id)`
   - `none` → empty (no scope filter)
2. **Label-resolved targets**: entities labeled `(Area |Floor |)Follower: <FeatureName>` that are in the scope set.
3. **Excluded**: entities labeled `<scope-prefix><FeatureName> Exclude: True` (e.g. `Area Lights Off Exclude: True`).
4. **If `label_targets - excluded` is non-empty → use that as the final target set.**
5. **Else → fallback**: enumerate entities in the scope set whose `domain` matches the feature's *default domain* (see table below), minus the excluded set.
6. **If still empty and the feature has no domain fallback** (e.g. `Ads`, `Night`) → trigger Error Mode.
7. **Run the feature's action** against the final target set.

This means a user can opt-in entities by labeling them `Area Follower: <Feature>` (most precise), or just rely on the domain default (e.g. all `light` entities in the area for `Lights Off`), and use `Exclude: True` to remove a specific entity from the fallback. Exclude has no effect when explicit follower labels are present because at that point the user has already deliberately opted-in the desired entities.

#### `toggle` modifier
`labeled_feature_generics` accepts a `toggle` boolean field (passed through automatically by `labeled_feature_follower` and by mapping scripts that wish to force a toggle for a given action). When `toggle: true`, generics **does not** dispatch a single service call against the resolved entities. Instead, for each entity in `final_targets` it:

1. Evaluates whether the feature is currently enabled on that entity, using the same truth function the Labeled Features State template sensor applies to Leaders:
   - `(scope-prefix)<F> Enable: <v>` / `Disable: <v>` labels on the entity, first;
   - else the default truth — `state == <F>` (case-sensitive) OR `state in ['on','true','home','open','detected','active','unlocked']`;
   - `(scope-prefix)<F> Invert: True` flips the result after.
2. Calls `script.labeled_feature_follower` with `leader_enabled` set to the opposite of currently_enabled and `toggle: false` (the direction has already been computed; the follower just runs its standard per-entity action).

Per-feature toggle semantics live in the follower (which already owns Enable/Disable/Invert/domain action for the standard Leader → Follower flow), not in generics. There is **no** per-domain "toggle service" branch (`light.toggle`, `fan.toggle`, `media_player.media_play_pause`, `homeassistant.toggle`); the follower picks the right action per entity based on its labels and domain.

Evaluation is **per-entity, not aggregate**: a `Screen` feature resolved to 3 followers (two currently enabled, one disabled) dispatches one "set disabled" call to the two enabled entities and one "set enabled" call to the disabled one. If you want aggregate "any-on wins" semantics, that has to be a per-feature design decision — set Enable/Disable values that line up on the same direction for all followers.

#### Generic feature catalog

| Feature | Default Domain Fallback | Action (toggle = false) | Action (toggle = true) |
|---|---|---|---|
| `Media Toggle` | `media_player` (most-recently-active — see below) | `media_player.media_play_pause` | same |
| `Media Play` | `media_player` (most-recently-active) | `media_player.media_play` | `media_player.media_play_pause` |
| `Media Pause` | `media_player` (most-recently-active) | `media_player.media_pause` | `media_player.media_play_pause` |
| `Media Next` | `media_player` (most-recently-active) | `media_player.media_next_track` | Error Mode (toggle invalid) |
| `Media Previous` | `media_player` (most-recently-active) | `media_player.media_previous_track` | Error Mode |
| `Media Seek Back` | `media_player` (most-recently-active) | `media_player.media_seek` `seek_position: max(current − 30s, 0)` — **silently falls back to `media_player.media_previous_track`** when the target's `supported_features` doesn't have the `SUPPORT_SEEK` bit (1024) set | Error Mode |
| `Media Seek Forward` | `media_player` (most-recently-active) | `media_player.media_seek` `seek_position: current + 30s` — **silently falls back to `media_player.media_next_track`** when the target lacks `SUPPORT_SEEK` (1024) | Error Mode |
| `Volume Up` | `media_player` (most-recently-active) | `media_player.volume_set` w/ `volume_level: min(current + 0.05, 1.0)` (5% step, single target) — **stepping** (see below) | Error Mode |
| `Volume Down` | `media_player` (most-recently-active) | `media_player.volume_set` w/ `volume_level: max(current − 0.05, 0.0)` (5% step, single target) — **stepping** | Error Mode |
| `Lights On` | `light` | `light.turn_on` | `light.toggle` |
| `Lights Off` | `light` | `light.turn_off` | `light.toggle` |
| `Lights Up` | `light` | `light.turn_on` w/ `brightness_step_pct: +10` — **stepping** | `light.toggle` |
| `Lights Down` | `light` | `light.turn_on` w/ `brightness_step_pct: -10` — **stepping** | `light.toggle` |
| `Fan On` | `fan` | `fan.turn_on` | `fan.toggle` |
| `Fan Off` | `fan` | `fan.turn_off` | `fan.toggle` |
| `Fan Up` | `fan` | `fan.increase_speed` | — (toggle delegates to follower; see below) |
| `Fan Down` | `fan` | `fan.decrease_speed` | — (toggle delegates to follower; see below) |

The `Volume Up` / `Volume Down` step is fixed at 5% and is applied via `volume_set` (rather than the integration's `volume_up` / `volume_down` defaults) so the increment is deterministic across integrations. Volume holds tick every 500 ms; lights hold every 300 ms (lights use `brightness_step_pct` so a shorter cadence feels right). The `Lights Up` / `Lights Down` step is fixed at 10% for now.

**Unknown / label-only features** (anything not in the catalog above — for example `Screen`, `TV Input`, `Bright`, `Accent`, `Ads`, `Night`, or any user-defined feature) resolve through the standard 4-step Provides resolver and then **delegate per-entity to `script.labeled_feature_follower`**. The follower applies the entity's own `(scope-prefix)<F> Enable:` / `Disable:` / `Invert:` / `Toggle:` labels and dispatches the correct domain-specific action. This is how a single `Area Provides: Screen` (or `(Area)Follower: Screen` plus `Screen Enable: HDMI1` / `Screen Disable: standby`) label on an entity is enough to make the feature work — no catalog entry is required, no service-call branch in generics is needed.

The catalog is therefore reserved for features that need *non-trivial* dispatch logic — media-player transport (most-recently-active target selection), seek with fallback to track-skip, stepping (hold loop + accumulator), light brightness step, etc. Plain "on/off/toggle this thing" features are covered by the unknown-feature follower-delegation path and don't need entries.

##### Media-player target selection (transport + volume + seek)

Every `media_player` generic feature — `Media Toggle`, `Media Play`, `Media Pause`, `Media Next`, `Media Previous`, `Media Seek Back`, `Media Seek Forward`, `Volume Up`, `Volume Down` — collapses the resolved follower set down to a **single, most-recently-active** `media_player` entity before dispatching the underlying service call. This avoids fan-out across an area's full speaker set, which otherwise causes double-press toggles (the second player flips the state the first one just set), volume drift on idle members of a speaker group, and seek/next/prev firing on whichever player happens to be sorted first rather than the one the user is actually listening on.

The selection algorithm runs once per call against `final_targets` (after Provides resolution, Exclude filtering and domain fallback). It picks the entity by these tiebreakers in order:

1. **Currently playing or buffering**, sorted by `last_changed` descending — the player that most recently transitioned into an active state wins.
2. Otherwise, the entity with the most recent `last_changed` overall (excluding `unknown` / `unavailable` / `none`).
3. As a final fallback (e.g. every candidate is unknown), `final_targets | first`.

Because the algorithm uses `last_changed`, "most recently active" survives the player going idle: if music played on the kitchen speaker an hour ago and on the office speaker five minutes ago and nothing is playing now, a `Volume Up` press in the kitchen still routes to the kitchen speaker because that's the one with the most recent state transition inside the kitchen's scope. It only crosses over when the office speaker becomes the most-recent across the *resolved scope's* media-player set.

This is also what makes the seek-fallback behaviour useful: the seek check inspects exactly one entity's `supported_features` bitmask. If `SUPPORT_SEEK` (1024 / `0x400`) is clear — common on Music Assistant queues, Snapcast, and some Squeezebox/streaming surfaces — the script silently dispatches `media_player.media_previous_track` (back) or `media_player.media_next_track` (forward) against the same selected target instead. No log line is emitted, because falling back to track skip is the desired behaviour on those integrations.

Lights, fans, and `Ads` / `Night` features are unaffected — they still target the full `final_targets` set.

#### Stepping / hold loop (Volume Up/Down, Lights Up/Down)

Four features in the catalog are *stepping* features: `Volume Up`, `Volume Down`, `Lights Up`, `Lights Down`. Each one runs in one of two modes depending on whether the caller passed a `leader_entity_id`:

- **One-shot** — caller did not pass `leader_entity_id` (manual dispatch, or a mapping script that just wants a single step). The script fires the underlying service call exactly once.
- **Held / repeating** — caller passed `leader_entity_id` (typically the button entity that mapped into this dispatch). The script enters a repeat loop that exits as soon as `states(leader_entity_id)` changes off its initial value — i.e. the user releases the button, or the button entity fires another event. The tick cadence is **500 ms** for `Volume Up`/`Volume Down` and **300 ms** for `Lights Up`/`Lights Down` (volume needs a slower step to feel comfortable since it's auditory feedback; brightness wants the snappier rate). A 200-iteration safety cap (~60-100 s of continuous holding at those rates) protects against a stuck leader.

The two modes are chosen automatically — mapping scripts (and any future button-family dispatcher) just need to forward `leader_entity_id` to get repeat-while-held behavior for free. There is no per-feature "loop" flag and no per-mapping-script loop code; the loop lives in `labeled_feature_generics` exactly once.

Inside the loop:

- **Scope, Provides resolution, Exclude filtering, and most-recently-active media-player target selection all run once before the loop starts.** Every tick reuses the same resolved `final_targets` (lights) or `_media_target` (volume).
- The inter-tick wait uses `wait_template:` watching `states(leader_entity_id) != _hold_initial`, with `timeout: 500 ms` (volume) or `300 ms` (lights) and `continue_on_timeout: true`. On timeout the loop ticks forward and re-fires the service call; on the leader emitting a new event (typically `*_long_release` ~50–150 ms after physical release), the wait resolves immediately, the `while:` re-evaluates, and the loop exits with <50 ms latency instead of waiting out a full inter-step interval. (`wait_template:` is used rather than `wait_for_trigger:` because trigger entity_ids cannot be templated at script-load time.)

**Volume Up / Volume Down use a local accumulator** (not a re-read of `state_attr(target, 'volume_level')` each tick). Before the loop the script snapshots the starting volume level once into `_vol_start`; each iteration computes `[_vol_start ± 0.05, 0.0..1.0] | min/max` into the same `_vol_start` local and calls `media_player.volume_set` with that absolute value. State is never read inside the loop. This is critical for integrations like `lnxlink` whose state echoes lag the write — reading mid-loop would race the echo, causing the value to stall or oscillate; the accumulator pattern guarantees each `volume_set` call carries a unique, monotonically increasing (or decreasing) absolute value.

**Lights Up / Lights Down use HA's built-in `brightness_step_pct`** on each iteration's `light.turn_on` call. The light integration owns the relative arithmetic, so no accumulator is needed — the script just re-fires the same call each tick.

Fan Up / Fan Down (`fan.increase_speed` / `fan.decrease_speed`) intentionally stay one-shot — the integration already owns a coarse speed table, so repeat-while-held isn't meaningful.

#### Calling `labeled_feature_generics` directly
The script accepts these fields (most are pass-through metadata from the caller):

- `feature` (required) — must match one of the catalog entries above (case-sensitive).
- `exclude_feature` (optional, defaults to `feature`) — the feature name used to build the Exclude label (`(Area |Floor |)<exclude_feature> Exclude: True`). This exists so that mapping scripts (like `labeled_feature_somrig`) can thread the *leader's* feature name through dispatched generic calls, keeping Exclude keyed on the leader (e.g. `Area Night Buttons Exclude: True` excludes an entity from every action dispatched by the Night Buttons leader) rather than on the dispatched generic action (`Area Lights Off Exclude: True`). When you call `labeled_feature_generics` directly you almost always want to leave this empty and let it default to `feature`.
- `scope`, `scope_id` — for area/floor resolution.
- `follower_entity_id`, `leader_entity_id` — used as fallback for area resolution when `scope_id` is empty.
- `leader_enabled` — pass-through for consistency.
- `toggle` (boolean, default `false`) — see the modifier section above.
- `error_mode` — `silent | log | alert | stop`. Standard Error Mode tiers as elsewhere.

When wired in via the standard Leader → Follower flow, all of these are passed automatically by `labeled_feature_follower` via its dispatch loop's `script` action items (see **The Dispatch Loop**).

#### Persistent Snapshots — the `Set Snapshot` catalog entry
`Set Snapshot` is a catalog entry that writes a mapping payload into `sensor.labeled_features_state.snapshots[<snapshot_name>]` from inside a script — typically used by long-running scripts that need their working state to survive `mode: restart` re-entries.

The snapshots attribute is keyed by a short script-chosen identifier (e.g. `sleep_timeout`) → an arbitrary mapping payload whose schema is owned by the calling script. Passing `payload: {}` deletes the entry.

Fields (in addition to the standard ones):

- `feature: Set Snapshot` (selects this branch).
- `snapshot_name` (required) — the key under `snapshots`. Convention: short script-specific identifier like `sleep_timeout`, `audio_mood_in_flight`.
- `payload` (required, mapping) — the value to store. Empty mapping (`{}`) means "delete the entry."

Behavior:

1. Fires the `labeled_feature_snapshot_set` event with payload `{snapshot_name, payload, timestamp: now().timestamp()}`.
2. `sensor.labeled_features_state` listens for that event and merges (or, on empty payload, removes) the entry under `snapshots[snapshot_name]`.
3. Other ticks (`state_changed`, `labeled_feature_set`) carry the snapshots dict through unchanged.

Calling pattern:

```yaml
- action: script.labeled_feature_generics
  data:
    feature: Set Snapshot
    snapshot_name: sleep_timeout
    payload:
      media_player.bedroom_main_audio: 0.45
```

To clear:

```yaml
- action: script.labeled_feature_generics
  data:
    feature: Set Snapshot
    snapshot_name: sleep_timeout
    payload: {}
```

Reading back:

```jinja
{{ state_attr('sensor.labeled_features_state', 'snapshots').get('sleep_timeout', {}) }}
```

This is the persistence surface used by `script.labeled_feature_sleep_timeout` to survive `mode: restart` re-entries. The fade snapshot needs to be read fresh on every dispatch (button mash, Night flip, Media Playing flip), and HA's script-local `variables:` block resets on every restart — so the sensor-attribute round-trip via Set Snapshot is the persistence layer.

#### Manual Overrides — the `Set Feature` catalog entry
`Set Feature` is a catalog entry that writes an entry into `sensor.labeled_features_state.features` from outside the leader/follower flow. It does not dispatch anything against a domain pool. Use it when scripts, dashboards, or REST clients need to flip a feature without maintaining a synthetic leader entity.

Fields (in addition to the standard ones):

- `feature: Set Feature` (selects this branch).
- `target_feature` (required) — the feature name whose state to write (e.g. `Night`).
- `scope` — `area | floor | global`. Matches the `features` attribute's second-level key.
- `scope_id` — area_id, floor_id, or empty for `global`.
- `enabled` (boolean, required) — the value to record.

Behavior:

1. Fires the `labeled_feature_set` event with payload `{target_feature, scope, scope_id, enabled, timestamp: now().timestamp()}`.
2. `sensor.labeled_features_state` listens for that event and writes the entry into `features[target_feature][scope][scope_id] = {enabled, mode, last_changed_timestamp, triggering_leader: ''}`. `mode` is preserved from the existing entry if any; otherwise defaults to `leader`.
3. `automation.labeled_feature_leaders` sees the change via its normal `attribute: features` trigger and dispatches followers exactly as if a leader had driven the change. The empty `triggering_leader` means leader-label parsing is skipped — only the implicit feature dispatch fires.

Override durability: a manual override on a given `(target_feature, scope, scope_id)` triple is sticky until a leader mapped to that same triple actually changes state. Leader changes for different features (or different scopes of the same feature) do not clobber it. Features with no backing leaders at all remain manual-only because the sensor's drop-orphans logic only drops entries when no leader maps to them; manual entries with `triggering_leader: ''` are exempt.

Calling pattern:

```yaml
- action: script.labeled_feature_generics
  data:
    feature: Set Feature
    target_feature: Night
    scope: global
    scope_id: ''
    enabled: true
```

### Button Mapping Scripts
Mapping scripts are how a specific button device's raw events get translated into generic feature calls. They are short branching scripts: read the raw `feature` string (which is the event name from the button entity, e.g. `1_short_release`), evaluate any contextual state needed for the device family (typically "is anything in this area currently playing media?"), and call `script.labeled_feature_generics` one or more times with the appropriate generic feature.

Each new physical button device family gets its own mapping script. There are currently three mapping scripts:
- `script.labeled_feature_somrig` — IKEA Somrig / E2123 (dots).
- `script.labeled_feature_styrbar` — IKEA STYRBAR (4-button + dimmer wheel).
- `script.labeled_feature_symfonisk` — IKEA SYMFONISK Gen 2 Sound Remote.

#### `script.labeled_feature_somrig`
Maps the IKEA Somrig (and other 2-button) device events into generic feature calls. The Somrig produces events of the form `1_short_release`, `1_long_press`, `1_double_press`, and similarly for button 2 (other variants like `1_long_release` and `1_initial_press` are ignored). The IKEA E2123 (dots) variant produces `dots_N_*` events — these are mapped to `N_*` first so both device types share the same logic.

**Inputs (passed automatically by the `Labeled Feature Leaders` automation alongside the Script dispatch — see **The Dispatch Loop**):**

- `feature` — raw event string from the button entity (e.g. `1_short_release`, `dots_2_double_press`).
- `leader_feature` — the leader's labeled feature name (e.g. `Night Buttons`). The leaders automation always sets this to the feature name it dispatched the script for. The somrig script uses it to scope Exclude evaluation: entities labeled `(Area |Floor |)<leader_feature> Exclude: True` are excluded from **both** the `media_playing` evaluation **and** every downstream `labeled_feature_generics` call. The downstream calls receive it via the `exclude_feature` field so that Exclude is keyed on the leader, not on whichever generic action happened to fire.
- `scope`, `scope_id`, `follower_entity_id`, `leader_entity_id`, `leader_enabled`, `toggle`, `error_mode` — standard pass-through.

**Contextual state:** the script computes `media_playing` by inspecting `media_player` entities in the resolved scope (area or floor — mirrors the `labeled_feature_generics` scope set), with any entities matched by the leader's Exclude label filtered out first. This is the only contextual signal it uses; other button-style features like night-mode awareness now live as their own generic features and are dispatched the same way as everything else.

**Scoping and Exclude:** the somrig script builds the same scope entity set that `labeled_feature_generics` uses (`area_entities` + `device_entities` for `area`, union over `floor_areas` for `floor`). When `leader_feature` is set, entities labeled `<leader_feature> Exclude: True` or `<scope-prefix><leader_feature> Exclude: True` and which fall inside the scope set are removed from the `media_playing` check. The same `leader_feature` is then forwarded as `exclude_feature` on every dispatched `labeled_feature_generics` call, so Exclude is consistently keyed on the leader's feature name (e.g. `Area Night Buttons Exclude: True` opts an entity out of every action the Night Buttons leader can dispatch — `Lights Off`, `Media Pause`, `Fan On`, `Night`, …).

**Event → generic-feature mapping:**

| Event | Playing | Not Playing |
|---|---|---|
| `1_short_release` | `Lights Off` (floor scope) + `Media Pause` | `Lights Off` (floor scope) |
| `2_short_release` | `Media Pause` | `Media Play` |
| `1_double_press` | `Media Seek Back` | `Fan On` (with `toggle: true`) |
| `2_double_press` | `Media Seek Forward` | `Night` |
| `1_long_press` | `Volume Up` | `Lights Up` |
| `2_long_press` | `Volume Down` | `Ads` |

Only the canonical "user did the thing" events — `*_short_release`, `*_double_press`, and `*_long_press` — are tracked. All other event variants from the device (`*_initial_press`, `*_long_release`, etc.) are deliberately ignored.

The `1_double_press` Not-Playing branch always calls `labeled_feature_generics` with `toggle: true` so the fan flips state regardless of the caller-passed toggle value. Every other branch passes through the incoming `toggle` value unchanged (so a `Toggle: True` label on the button entity itself is still honored everywhere it makes sense).

**Long-press repeat behavior:** the three *stepping* long-press branches — `1_long_press` Playing (`Volume Up`), `1_long_press` Not Playing (`Lights Up`), and `2_long_press` Playing (`Volume Down`) — dispatch the matching generic feature exactly once each, passing `leader_entity_id` through. The repeat-while-held loop lives in `labeled_feature_generics` (see **Stepping / hold loop** above), so somrig does not need its own loop — it just forwards `leader_entity_id` and the generic dispatcher takes care of holding the action open until the button is released. The `2_long_press` Not-Playing branch dispatches `Ads` as a toggle, which is not a stepping feature and runs once.



`Lights Off` is the one feature the somrig script does not dispatch at the caller's scope: both the Playing and Not-Playing `1_short_release` branches forward `scope: floor` (with `scope_id` set to the leader's resolved floor). This is intentional — a single short-press on any button in the house should clear every light on that floor, not just the area the button happens to live in. Every other generic feature dispatched from somrig uses the scope passed in by the leader automation. Exclude on the leader's feature (`<scope-prefix><leader_feature> Exclude: True`) still applies to the floor-scoped `Lights Off` call because `exclude_feature` is forwarded independently of `scope` / `scope_id`.

#### Wiring a button to `labeled_feature_somrig`

The button event entity should be labeled:

```
Feature Leader
Area Leader: <button_feature_name>
Area <button_feature_name> Script: script.labeled_feature_somrig
Area <button_feature_name> Arg feature: leaders.current_value
```

This is the standard "no-tag Script on a Leader" pattern: when the button's state changes (i.e. it emits a new event), the `Labeled Feature Leaders` automation dispatches `labeled_feature_somrig` through the loop's `script` action item with `feature` set to the event string from the button entity's state, plus all the standard pass-through fields. Because the `Area <button_feature_name> Script:` label is replacement-style, the implicit feature dispatch is suppressed and only `labeled_feature_somrig` runs.

Followers within the area (or floor, depending on the leader's scope prefix) participate via their existing `(Area |Floor |)Follower: <GenericFeature>` labels — e.g. `Area Follower: Lights Off`, `Area Follower: Night`. The somrig script doesn't reference those labels directly; it just calls `labeled_feature_generics` for the appropriate generic feature, and that's where label resolution happens.

#### `script.labeled_feature_styrbar`
Maps the IKEA STYRBAR (4-button + dimmer wheel) device events into generic feature calls. STYRBAR produces these events: `on`, `off`, `brightness_move_up`, `brightness_move_down`, `brightness_stop`, `arrow_left_click`, `arrow_left_hold`, `arrow_left_release`, `arrow_right_click`, `arrow_right_hold`, `arrow_right_release`.

The initial implementation is **lights-only**. The four `arrow_*` events are reserved for future expansion (likely Media Previous / Media Next / Media Seek when playing, or area-feature toggles when not) and currently dispatch nothing — they are present as no-op `choose:` branches with a `# TODO` marker rather than absent, so the script does not raise Error Mode when STYRBAR fires them.

The `*_release` and `brightness_stop` events are deliberately not represented at all. The hold loop inside `labeled_feature_generics` already exits on the leader's state change (see **Stepping / hold loop** above), so the explicit "the user just let go" event isn't needed by this script.

**Inputs:** identical to `labeled_feature_somrig` (`feature`, `leader_feature`, `scope`, `scope_id`, `follower_entity_id`, `leader_entity_id`, `leader_enabled`, `toggle`, `error_mode`). All standard pass-through fields are forwarded on every downstream `labeled_feature_generics` call. `leader_feature` is forwarded as `exclude_feature` on every dispatched call, exactly as in somrig, so `(Area |Floor |)<leader_feature> Exclude: True` on an entity opts it out of every action this script can dispatch.

**Event → generic-feature mapping (all area-scoped):**

| Event | Action |
|---|---|
| `on` | `Lights On` (one-shot) |
| `off` | `Lights Off` (one-shot) |
| `brightness_move_up` | `Lights Up` — forwards `leader_entity_id`, so generics runs the hold loop until the wheel stops moving |
| `brightness_move_down` | `Lights Down` — hold loop |
| `brightness_stop` | ignored (loop exits on state change) |
| `arrow_left_click` | TODO — no-op stub |
| `arrow_left_hold` | TODO — no-op stub |
| `arrow_right_click` | TODO — no-op stub |
| `arrow_right_hold` | TODO — no-op stub |
| `arrow_left_release`, `arrow_right_release`, all `*_initial_press` | not represented; falls through silently |

Because the script is lights-only it does not compute `media_playing` — the prologue is reduced from the full somrig version (which still has to inspect every media player in the scope for the volume branches) to just normalized inputs.

**Wiring** is identical to somrig — replace `script.labeled_feature_somrig` with `script.labeled_feature_styrbar` in the label set on the button entity:

```
Feature Leader
Area Leader: <button_feature_name>
Area <button_feature_name> Script: script.labeled_feature_styrbar
Area <button_feature_name> Arg feature: leaders.current_value
```

#### `script.labeled_feature_symfonisk`
Maps the IKEA SYMFONISK Gen 2 Sound Remote events into generic feature calls. SYMFONISK produces these events: `toggle`, `track_previous`, `track_next`, `volume_up`, `volume_down`, `volume_up_hold`, `volume_down_hold`, `dots_1_initial_press`, `dots_1_long_press`, `dots_1_short_release`, `dots_1_long_release`, `dots_1_double_press`, `dots_2_initial_press`, `dots_2_long_press`, `dots_2_short_release`, `dots_2_long_release`, `dots_2_double_press`.

This script **mixes scopes per event** — the transport keys go global, the volume rocker is split between area-light control on short taps and area-vs-global on long-hold (depending on whether media is playing), and the two `dots_*` buttons each carry their own user-tuned scope. The full prologue from `labeled_feature_somrig` is reused so the volume_*_hold branches can read the same `media_playing` signal somrig uses (including Exclude filtering and the 4-step `Media Player` Provides resolver).

**Inputs:** identical to `labeled_feature_somrig`. `leader_feature` is forwarded as `exclude_feature` on every dispatched call.

**Ignored events:** `*_initial_press` and `*_long_release` for both dots — not represented in the choose: at all.

**Event → generic-feature mapping:**

| Event | media_playing | Scope used | Action |
|---|---|---|---|
| `toggle` | n/a | `none` (global) | `Media Toggle` |
| `track_previous` | n/a | `none` | `Media Previous` |
| `track_next` | n/a | `none` | `Media Next` |
| `volume_up` | n/a | caller's scope (area) | `Lights On` — single taps always control area lights, regardless of whether anything is playing |
| `volume_down` | n/a | caller's scope (area) | `Lights Off` |
| `volume_up_hold` | playing | `none` | `Volume Up` — forwards `leader_entity_id` (hold loop in generics) |
| `volume_up_hold` | not playing | caller's scope (area) | `Lights Up` — hold loop |
| `volume_down_hold` | playing | `none` | `Volume Down` — hold loop |
| `volume_down_hold` | not playing | caller's scope (area) | `Lights Down` — hold loop |
| `dots_1_short_release` | n/a | caller's scope (area) | `Screen` with `toggle: true` |
| `dots_1_double_press` | n/a | caller's scope (area) | `TV Input` with `toggle: true` |
| `dots_1_long_press` | n/a | `floor` (resolved from `leader_entity_id`/`follower_entity_id`) | `Bright` with `toggle: true` |
| `dots_2_short_release` | n/a | caller's scope (area) | `Ads` with `toggle: true` |
| `dots_2_double_press` | n/a | `none` (global) | `Night` with `toggle: true` |
| `dots_2_long_press` | n/a | caller's scope (area) | `Accent` with `toggle: true` |

The `Screen`, `TV Input`, `Bright`, and `Accent` features are user-defined: they have no entries in `feature_meta`, so they resolve entirely via `(Area |Floor |)Follower: <FeatureName>` (or `Provides:` shorthand) labels on the target entities. `Ads` and `Night` carry the same toggle semantics as everywhere else (`homeassistant.toggle` on whatever's labeled in scope). All six dots_* branches force `toggle: true` regardless of the caller-passed value — every dots button on this remote is explicitly a toggle action.

The volume rocker is deliberately rebound:

- **Single taps** (`volume_up` / `volume_down`) always control **area lights**, on the theory that grabbing the remote and tapping volume in a room with nothing playing should turn the lights on/off, not be a no-op.
- **Long-hold** (`volume_up_hold` / `volume_down_hold`) branches on `media_playing` in the resolved scope: if anything is playing it acts as global volume (so the remote's volume keys feel "right" regardless of where you're standing); if nothing is playing it dims the area's lights (the natural extension of the single-tap behavior).

The transport keys (`toggle`, `track_previous`, `track_next`) are always **global** (`scope: none`) so the remote works as a house-wide transport regardless of which area it's pressed in. This matches the muscle-memory of a sound-remote: pressing skip should always do the right thing on whatever is currently playing.

`dots_1_long_press` is the only event that **uses floor scope** — the user's `Bright` feature is intentionally a floor-wide toggle. The script resolves the floor id from `leader_entity_id` / `follower_entity_id` via `floor_areas()` in the prologue, so it works regardless of whether the caller passed `scope_id`.

**Wiring** mirrors somrig and styrbar:

```
Feature Leader
Area Leader: <button_feature_name>
Area <button_feature_name> Script: script.labeled_feature_symfonisk
Area <button_feature_name> Arg feature: leaders.current_value
```

### Labeled Feature Sleep Timeout
`script.labeled_feature_sleep_timeout` is a composite-action feature that gradually fades media volume, mutes, holds the playback position with seek-back ticks, then unmutes and restores the original volume — typically used to wind down audio at night without abruptly cutting it off.

It composes with the rest of the system via the standard Leader/Follower dispatch loop. Unlike the per-button mapping scripts it carries no per-event mapping; it's a single resumable side-effect-ful sequence wrapped in `mode: restart`. Cancellation is handled **in-script** — there is no companion automation. Restarting the script during a fade re-evaluates the gate and either restarts the fade or cancel-restores.

#### Gate rule
On every invocation (whether first-call or `mode: restart` re-entry) the script reads fresh values for two features from `sensor.labeled_features_state.features`:

```
should_run = night_enabled AND media_playing_enabled
```

- `night_enabled` — `features[<feature_night>][<scope>][<scope_id>].enabled`. `<feature_night>` defaults to `Night`.
- `media_playing_enabled` — `features[<feature_media_playing>][<scope>][<scope_id>].enabled`. `<feature_media_playing>` defaults to `Media Playing`.

The `leader_enabled` value passed by the dispatch loop is intentionally **ignored**. The script is dispatched from multiple entry points (button leader, Night follower, Media Playing follower) and each carries its own `leader_enabled`; reading both gate features fresh from the sensor guarantees consistent behavior regardless of which entry point fired.

#### Re-trigger prelude — two branches

Before any gate evaluation runs, the script applies a **two-branch re-trigger prelude** that depends on *what the user did*. Both branches are gated on `original_volumes` being non-empty (i.e. a fade is already in flight):

- **Branch A — stepping interaction in progress (Volume Up/Down hold, Lights Up/Down hold).** The user is actively dialing the volume (or brightness). The hold loop inside `labeled_feature_generics` is writing `media_player.volume_set` against the same player every 300ms. If we restored to the snapshotted "original" we'd race those writes and the volume would bounce. Instead we **re-baseline the snapshot** to whatever `volume_level` currently reads — the user's new "original" is wherever they're dialing to. Subsequent cancel-restore paths (Night-off, Media-off) then correctly restore to this new baseline, not the pre-hold value. One-tick-behind is fine — the user's net interaction (start → hold → release) re-baselines at both press-start and press-release events, so the release dispatch always carries the final committed value.

- **Branch B — discrete event (button short press, Night flip, Media Playing flip).** Restore the snapshotted volume and fall through to the gate, **keeping** the snapshot as the baseline — no clear, and no `volume_level` re-read. Re-reading immediately after the restore would race the integration's state echo (lnxlink / MQTT players can lag seconds behind a `volume_set`) and could capture the still-halved / still-muted level as the new "original", progressively corrupting the baseline toward 0 on every reset press. This is the "reset the timer" / "cancel the timer" semantic, depending on what the gate then evaluates to: gate true → Step 4 is a no-op and the fade re-arms at the true original baseline; gate false → Step 3 restores again (idempotent) and clears the snapshot.

The classifier is `_is_stepping`, evaluated against the **triggering leader's current state**:

```jinja
{{ states(leader_entity_id) | lower | regex_search('(long_press|long_release|hold|_move_)') is not none }}
```

This matches the canonical hold-in-progress / just-released event names emitted by the IKEA button families currently wired (`*_long_press`, `*_long_release`, `volume_up_hold`, `volume_down_hold`, `brightness_move_up`, `brightness_move_down`, `brightness_stop`). On a state-domain leader (`input_boolean.night_mode`, `media_player.bedroom_main_audio`) the live state is `on`/`off`/`playing`/`paused`/etc and never matches → Branch B runs, which is the correct behavior for Night-off and Media-Playing-off cancels.

After whichever branch ran (or neither, if there was no snapshot in flight), the script falls through to the gate evaluation as if it were a fresh first call — no `stop:`.

Then the gate decides what happens next:

- `should_run == true` → snapshot the media player's current volume (only if the current target isn't baselined yet — a mid-fade reset keeps the existing baseline; if the Media Playing `triggering_leader` changed mid-fade, the new player's current volume is *merged* into the baseline so the old player's entry still restores on cancel), then run the fade sequence:
  1. Wait `sleep_timeout_minutes` (default 15)
  2. Halve the volume
  3. Wait 1 minute
  4. "Mute" via `volume_set: 0` (see **Mute via volume_set: 0** below)
  5. Wait 1 minute
  6. Seek back 30 s every 0.5 s × 20 iterations (≈ 10 s) — keeps the playback position "live" during the silent hold; **silently falls back to `media_player.media_previous_track`** when the target's `supported_features` doesn't include `SUPPORT_SEEK` (bit `0x02`) — same pattern as `Media Seek Back` in `labeled_feature_generics`
  7. Restore the snapshot's volume (pre-pause) — lands while the player is still in its playing state, which several integrations (Music Assistant, Squeezebox, lnxlink, some MQTT players) require for the write to commit; this also "unmutes" (the `volume_set: 0` is undone here)
  8. **Pause the player** via `media_player.media_pause`, guarded — skipped when the target doesn't advertise `SUPPORT_PAUSE` (bit `0x01`); after the call the script waits up to 5 s for the state to land in `paused` / `idle` / `off` / `standby`. When pause is unsupported or the verification fails, the failure is routed through the script's `error_mode` and the optional `pause_fallback` entity is dispatched (`button.*` → `button.press`, `script.*` → `script.turn_on`; never a toggle — a toggle would resume an already-paused player). By this point we've seek-back'd well into the past, and the gate has remained `true` for the full timeout window, so the desired end-state is *silent and paused*, not silent-then-resume-mid-show
  9. Restore the snapshot's volume again (post-pause) — belt-and-suspenders so the end state is the original level regardless of which player state the integration accepts volume writes in; a harmless no-op where a paused player rejects `volume_set`
  10. Clear the snapshot
- `should_run == false` → cancel-restore. Restores the snapshot again if one survived the prelude (idempotent — Branch B already restored), clears the snapshot, then stops.

#### Screen-off piggyback (Step 1c)

When the dispatching leader's most recent event matches the `screen_off_event` field (default `1_short_release`, case-insensitive — read from `sensor.labeled_features_state.leaders[<eid>].current_value`, so it works on event-domain button entities) **and** the Night gate passes, the script additionally dispatches `feature: <screen_off_feature>` (default `Screen`) through `script.labeled_feature_generics` with `leader_enabled: false` / `toggle: false`, forcing every `(Area )Follower: Screen` entity in the scope into its disable path. This runs *alongside* (not instead of) the normal arm/cancel/restore flow — no `stop:` — so a Night-mode short-press both arms the sleep timer and turns the area's screens off. Set `screen_off_event` to `''` to disable the branch entirely. The dispatch goes direct through generics rather than `Set Feature` so repeat presses fire every time — the manual-override path would no-op once the entry is already `enabled: false`.

#### How re-trigger semantics work per entry point

The prelude + gate combination handles every cancellation and arming case. Walking through the cases:

- **Sleep Timer button short-press (mid-fade)** — Trigger state is `*_short_release` → not stepping → Branch B: restore (snapshot kept as the baseline). Gate evaluates `Night AND Media Playing` — both still true (audio still playing, Night still on) → arm a fresh 15-minute timer at the true original volume. The button becomes the natural "reset the timer" gesture.
- **Sleep Timer button press (nothing armed yet)** — Prelude both branches skip (snapshot empty). Gate evaluates; arms a fade if both gate features are true.
- **Volume Up button held (mid-fade)** — Trigger state is `*_long_press` → stepping → Branch A: re-baseline snapshot to current volume. Snapshot now tracks what the user is dialing to (one tick behind). 15-min delay restarts in Step 5. Volume Up's own hold loop continues writing volume_set unimpeded — no race.
- **Volume Up button just released (mid-fade)** — Trigger state is `*_long_release` → stepping → Branch A: re-baseline snapshot to the volume the user settled on. This is the dispatch that "commits" the new baseline.
- **Night-off mid-fade** — Trigger state is `off` (or `Day`, from `input_select.house_mode`) → not stepping → Branch B: restore (snapshot kept). Gate evaluates `false AND true = false` → Step 3 cancel-restore (restore is an idempotent no-op after Branch B) + clear, stops. Volume restored, timer cancelled.
- **Media Playing → false mid-fade (pause / stop)** — Trigger state is `paused`/`idle`/etc → not stepping → Branch B: restore (snapshot kept). Gate evaluates false → Step 3 cancel-restore (idempotent no-op) + clear, stops.
- **Media Playing → true (fresh arm via the bedroom speaker turning on)** — Prelude both branches skip (no snapshot yet). Gate evaluates `Night AND true = true` → arm. **This is the primary arming path for the bedroom use case**: the button's other follower turns on the media player, the media player going `off → playing` flips `Media Playing.enabled` false → true, the leader automation dispatches this script via the Media Playing follower wiring, and the gate arms the fade. The user doesn't have to press the Sleep Timer button directly.
- **Play resumed after a Night-off cancel** — Prelude branches skip (Night-off already cleared the snapshot). Gate evaluates `false AND true = false` → no-op cancel-restore, stops. Timer does **not** re-arm. The gate is what protects this case; no separate guard is required.

This is more sophisticated than the previous "Media-Playing-when-in-flight guard." That guard correctly handled the play-after-Night-off re-arm case but blocked the primary arming path through Media Playing (button → media on → Media Playing flips → script dispatched and stopped). The two-branch prelude gets the same protection via the gate (Night is off, gate says `false` regardless of Media Playing) and additionally handles the Volume Up race that a simple universal restore would create.

#### Mute via volume_set: 0
The script doesn't use `media_player.volume_mute` anywhere. Instead, the "mute" step is just `media_player.volume_set: 0`, and the restore step at the end of the fade (and in cancel-restore) is `media_player.volume_set: <snapshot>` — which naturally "unmutes" since the prior step only set the volume to 0.

Why: some `media_player` integrations (notably some MQTT players and `lnxlink` in certain configs) advertise `SUPPORT_VOLUME_MUTE` via `supported_features` but the underlying device rejects the call at runtime. Rather than capability-checking the bitmask (which can lie), the script sidesteps the question entirely. `volume_set` works on every integration.

The audible result is identical to a real mute: silent during the seek-back hold, restored at the original level on completion. There is no separate "unmute" step in the fade sequence — it's collapsed into the restores. (The fade also pauses the player between the two restores — steps 7–9 above — so when the user comes back the next morning the player is sitting paused at the original volume rather than mid-track at the volume the fade halved down to.)

#### Seek-back loop tick rate
The seek-back loop runs **20 iterations at 0.5 s cadence**, with each iteration seeking back 30 s. That's a very tight ~10 s total hold (down from the original 10-minute version), but the rapid back-step keeps the player's cursor pinned well in the past so any auto-advance to the next track or end-of-queue during the silent step is undone before it can take effect.

Seek calls match the `Media Seek Back` pattern in `labeled_feature_generics`:

- **Supported** (`SUPPORT_SEEK` / bit `0x02` of `supported_features` is set) — `media_player.media_seek` with the back-stepped position, wrapped in `continue_on_error: true` so a transient seek failure doesn't stall the loop.
- **Not supported** — silently falls back to `media_player.media_previous_track` on the same target, also `continue_on_error: true`.

#### Fields

| Field | Required | Default | Description |
|---|---|---|---|
| `media_player` | no | — | **Override.** When set, the script targets this entity_id directly. Otherwise resolved from the Media Playing feature's `triggering_leader`. |
| `feature_night` | no | `Night` | Feature name to read for the Night gate. |
| `feature_media_playing` | no | `Media Playing` | Feature name to read for the playing gate. The script also reads `triggering_leader` from this triple to resolve the target media player. |
| `sleep_timeout_minutes` | no | `15` | Wait before the fade begins. |
| `scope`, `scope_id` | no | `area` / — | Pass-through from the dispatch loop. Used to key the sensor lookup. |
| `leader_enabled`, `leader_entity_id`, `follower_entity_id`, `feature`, `leader_feature`, `toggle` | no | — | Standard pass-through. `leader_enabled` and `toggle` are intentionally ignored. |
| `error_mode` | no | `log` | `silent / log / alert / stop`. Used for the "couldn't resolve media_player" guard and the pause-verification failure. |
| `pause_fallback` | no | `''` | Entity dispatched when the target doesn't advertise `SUPPORT_PAUSE` or the post-pause state verification fails (e.g. lnxlink-style players). `button.*` → `button.press`, `script.*` → `script.turn_on`; never a toggle. Empty = only surface via `error_mode`. |
| `screen_off_event` | no | `1_short_release` | Button event name that triggers the Step 1c screen-off dispatch when the Night gate passes. Empty string disables Step 1c. |
| `screen_off_feature` | no | `Screen` | Feature name dispatched by the Step 1c screen-off path. |

#### Required label wiring (minimal — zero Args)

The script has sensible defaults for every Arg, and resolves the target media player from the `Media Playing` feature's `triggering_leader`. **No Args are needed in the normal case** — wire labels only.

**1. Bedroom media player entity (e.g. `media_player.bedroom_main_audio`).**
Declares the player as the `Media Playing` leader for its area. Its `Enable: playing` label is what makes the sensor record `triggering_leader = <this entity_id>` for the `Media Playing.area.<bedroom>` triple — which is what the script reads to find the player.
```
Feature Leader
Area Leader: Media Playing
Area Media Playing Enable: playing
```

**2. The script entity (`script.labeled_feature_sleep_timeout`).**
Assign the script to the bedroom area in the entity registry, then apply both follower wirings so the script reacts to Night flipping *and* media stopping mid-fade:
```
Area Follower: Night
Area Night Script: script.labeled_feature_sleep_timeout

Area Follower: Media Playing
Area Media Playing Script: script.labeled_feature_sleep_timeout
```
`Area Night Script:` / `Area Media Playing Script:` are replacement-style — they suppress the implicit feature action (which would try `script.turn_on` / `script.turn_off`) and dispatch the script directly.

**3. (Primary trigger — button press.) Button event entity.**
Add alongside the existing somrig wiring:
```
Area Leader: Sleep Timer
Area Sleep Timer Script: script.labeled_feature_sleep_timeout
```
Any state change on the button fires the script. The gate rule (Night enabled AND Media Playing enabled, both read fresh from the sensor) then decides whether to start a fade or cancel-restore. The existing somrig labels (`Area Leader: Night Buttons` + its Script/Arg) continue to handle the per-event light/media actions independently — the two features dispatch in parallel via the leaders automation.

#### Full-override variant (all Args declared)

Useful when you want to pin behavior explicitly — e.g. force a specific media player regardless of the Media Playing leader, use non-default feature names, or change the timeout per-trigger:

```
# On the script entity (Night follower path):
Area Follower: Night
Area Night Script: script.labeled_feature_sleep_timeout
Area Night Arg media_player: media_player.bedroom_main_audio
Area Night Arg feature_night: Night
Area Night Arg feature_media_playing: Media Playing
Area Night Arg sleep_timeout_minutes: 20

# On the script entity (Media Playing follower path):
Area Follower: Media Playing
Area Media Playing Script: script.labeled_feature_sleep_timeout
Area Media Playing Arg media_player: media_player.bedroom_main_audio
Area Media Playing Arg feature_night: Night
Area Media Playing Arg feature_media_playing: Media Playing
Area Media Playing Arg sleep_timeout_minutes: 20

# On the button entity (Sleep Timer leader path):
Area Leader: Sleep Timer
Area Sleep Timer Script: script.labeled_feature_sleep_timeout
Area Sleep Timer Arg media_player: media_player.bedroom_main_audio
Area Sleep Timer Arg feature_night: Night
Area Sleep Timer Arg feature_media_playing: Media Playing
Area Sleep Timer Arg sleep_timeout_minutes: 20
```

Args are pooled per dispatched feature, so each path needs its own copy of any Arg you want applied — there is no shared pool across features.

#### Snapshot semantics across restart
`original_volumes` is persisted in **`sensor.labeled_features_state.snapshots.sleep_timeout`** — the shared snapshot store maintained by the trigger-based template sensor. The script reads it back via `state_attr('sensor.labeled_features_state', 'snapshots')['sleep_timeout']` in Step 0 and writes back via `script.labeled_feature_generics` with `feature: Set Snapshot, snapshot_name: sleep_timeout, payload: <dict>`. Passing `{}` as the payload deletes the entry. The same Set Snapshot path is what every other long-running script uses when it needs state across `mode: restart`.

We deliberately do NOT use the script's own top-level `variables:` block as the persistence surface. HA's template engine doesn't reliably expose `variables:` assignments as state attributes across `mode: restart` — the next run sees the variables block re-initialize to its declared default before Step 0 has a chance to read the previous run's value, so any snapshot stored there gets clobbered. The sensor-attribute round-trip avoids that race because the sensor's render is triggered by the `labeled_feature_snapshot_set` event independently of the script's lifecycle.

The snapshot is cleared at the end of a successful fade *and* at the end of every cancel-restore branch so the next fresh full-run snapshots cleanly.

##### Step 1b classifier reads from the sensor, not `states()`
The re-trigger prelude classifies "stepping in progress" vs. "discrete event" by reading the button leader's most recent event name. **The classifier reads from `sensor.labeled_features_state.leaders[<leader_entity_id>].current_value`, not from `states(leader_entity_id)`.** For `event`-domain entities (every IKEA button entity in this house), `states()` returns the ISO timestamp of the last event, not the event name. The sensor stores the actual event name in `current_value` via the `attributes.event_type | default(state)` accessor. Reading `states()` would never match the stepping regex on a button leader, causing every Volume Up/Down hold to fall through to the "restore" branch and producing visible volume bouncing at the start of every hold.

There is one subtle window: if a restart fires *between* step 4 (mute) and step 7 (restore) and the gate now says `should_run == true` (e.g. play resumed mid-fade and Night is still on), the script re-uses the snapshot but re-starts from step 1 — so the user gets another 15 minute timer at the muted volume. The next interaction (resume play → mute timeout → unmute or button press) will then run a proper restore. This is the documented trade-off of the in-script cancel model.

#### Adding a new button mapping script
For a different button family (e.g. IKEA STYRBAR, Hue dimmer, custom MQTT button):


1. Create a new script named `script.labeled_feature_<device_family>`.
2. Accept the same standard fields (`feature`, `scope`, `scope_id`, `follower_entity_id`, `leader_entity_id`, `leader_enabled`, `toggle`, `error_mode`).
3. Use a `choose:` block to branch on the raw event names this device produces.
4. For each branch, evaluate whatever contextual state makes sense for that device family (media playing, time of day, etc.) and call `script.labeled_feature_generics` once per generic feature you want to dispatch.
5. Wire it in to your button entity using the same no-tag-`Script`-on-a-Leader pattern as above.

The generic catalog lives in `labeled_feature_generics`; mapping scripts should never run service calls directly — they should always go through the generic dispatcher so that label resolution, Exclude, and the `toggle` modifier work consistently.


{{< examples title="Example labels" >}}
