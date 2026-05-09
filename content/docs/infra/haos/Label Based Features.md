# Theory
There are TONs of ways to write automations in Home Assistant, and I've tried most of them! Unfortunately the majority of them are brittle or require too much maintenance. After lots of experimenting and a career working with software, these are my suggestions as far as how features in Home Assistant should be written, as well as the functions I currently have written. 

## Acceptance Criteria
The most maintainable, scalable, and dynamic approach to handling automations in Home Assistant is to utilize labels and areas/floors together. The idea is that you should be able to configure a device's area and it's entities' labels, and _everything should just **work**._ If an approach can't support this, it's discarded. 

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
- Labeled Feature Leaders (Template Sensor)
	- Tracks timestamps on all the entities with the "Feature Leader" label.
	- This also allows for tracking the previous state of the entities.
	- Maintains two attributes on the sensor: `leaders` and `features`.
		- `leaders` - keyed by entity ID: `{ current_value, previous_value, last_changed_timestamp, features }`. The nested `features` dict maps each feature name the entity leads to its pre-computed `{ enabled (post-invert), scope }`. Pre-computing here means the automation never needs to re-evaluate Enable/Disable/Invert labels at trigger time.
		- `features` - flattened view keyed by feature name with the most recently changed leader's data. Used by argument substitutions (`[features].[feature_name].[enabled]`) in script calls.
	-  `unique_id` to enable entity registry features, UI customization (rename, disable), and stable entity identity across reloads.
- Labeled Feature Leaders (Automation)
	- This is where all of the leader logic goes. It calls the follower script when the `leaders` attribute changes.
	- It detects the last updated timestamp and checks for leaders that have updated since then.
	- Reads pre-computed `enabled` and `scope` directly from `trigger.to_state.attributes.leaders[entity_id].features[feature_name]` - no label re-evaluation at runtime.
	- Applies runtime-only filters (Only, Between / Not Between, Increasing / Decreasing) before deciding whether to call the follower script for each feature. `Between`/`Not Between` use `now()` which is only available at trigger time. For `Increasing`/`Decreasing`, both `current_value` and `previous_value` are read from `trigger.to_state.attributes.leaders[entity_id]` - the sensor's trigger-time snapshot - rather than from `states()` live state. This ensures direction detection is consistent even when the entity changes again before the automation finishes evaluating.
	- Use `mode: queued` so that rapid or simultaneous leader state changes are all processed sequentially.
- Labeled Feature Follower (Script)
	- This is ran by the automation, but because the leader values are passed into the script, you can also run this by hand against individual followers (useful for testing).
	- It accepts:
		- follower_entity_id (mandatory)
		- feature (mandatory)
		- leader_enabled boolean (mandatory)
		- leader that triggered (optional)
		- scope (area, floor, none) (optional)
		- scope_id - the resolved area_id or floor_id that corresponds to the scope (optional, passed automatically by the automation)
	- Then evaluates the follower labels and sets the follower to the appropriate value only if it's different from what is set currently.
- Labeled Feature Button (Script)
	- This contains all the logic for running media and button based features.
	- Because of the limitations of blueprints, it makes sense to have a single shared script rather than many little ones... Without this limitation I'd go for a file / script per function.
	- The desired functionality should be passed as "feature".
	
---

# Features & Labels
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
## Optional Labels
These define additional functionality that can optionally be applied via labels. They will all roughly be formatted like `FEATURE_NAME_HERE LABEL_FUNCTION: variables/options/args`

``` Examples
FEATURE_NAME_HERE (Enable|Disable): A_STRING_HERE
FEATURE_NAME_HERE Only: (Disable|Enable)
FEATURE_NAME_HERE Invert: (False|True)
FEATURE_NAME_HERE Decreasing|Increasing: True
FEATURE_NAME_HERE (|Not )Between: <a_24_h_format_time>:<a24_h_format_time>

FEATURE_NAME_HERE (Enable|Disable) Script: script.NAME_OF_SCRIPT_TO_CALL
FEATURE_NAME_HERE (Enable|Disable) Arg FIELD_NAME: %
FEATURE_NAME_HERE Script: script.NAME_OF_SCRIPT_TO_CALL
FEATURE_NAME_HERE Arg FIELD_NAME: %

FEATURE_NAME_HERE Error Mode: (Silent|Log|Alert|Stop)
```
Most of them apply to both leaders and followers with slightly different functionality.


### Leader Labels
The order here matches the evaluation order in the automation. This is helpful to understand when considering how multiple labels will interact. 
(Note: Double check this order is correct)

| Label Function           | Value / Arg                                         | Function                                                                                                                                                                                                                                                                | Notes                                                                                                                                                                                           |
| ------------------------ | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enable \| Disable        | A_STRING_HERE<br><br>Arg required                   | When the leader's state matches A_STRING_HERE, the feature is triggered as Enabled and when it changes from the supplied value it triggers as disabled.                                                                                                                 | It does not trigger as disabled when the previous value doesn't match the feature.                                                                                                              |
| Only                     | Enable\|Disable<br><br>Default: None/both           | Will only run followers when leader's trigger evaluates to "enabled"/on or "disabled"/off                                                                                                                                                                               |                                                                                                                                                                                                 |
| Invert                   | True\|False<br><br>Default: False                   | If True will invert the leader_enabled value passed to the follower.                                                                                                                                                                                                    | Invert applied to followers modifies the action rather than trigger.                                                                                                                            |
| Decreasing \| Increasing | True<br><br>Default: False                          | This should check the previous value and if it is decreasing or increasing and matches the label, trigger the feature.                                                                                                                                                  | It doesn't make sense to use this on a follower                                                                                                                                                 |
| (\|Not )Between          | (<24_h_fmt>\|-):(<24_h_fmt>\|-)<br><br>Arg required | Will only trigger/run if the current time matches the one of the provided Between labels.                                                                                                                                                                               | An entity can have more than one Between label. They will all be detected and evaluated with an or.                                                                                             |
| (Enable\|Disable) Script | NAME_OF_SCRIPT_TO_CALL<br><br>Arg required          | Calls the named script with arguments provided from labels. If it starts with `automaton.`  or `scene.` simply trigger the automation and don't pass any variables.                                                                                                     |                                                                                                                                                                                                 |
| Error Mode               | (Silent\|Log\|Alert\|Stop)                          | - Silent: Silently skips errors<br><br>- Log: Logs errors to the Home Assistant logs and continues<br><br>- Alert: Raises an alert and continues (note: alerting hasn't been started yet, so this should be a stub)<br><br>- Stop: Stop running the automation / script<br><br>The Stop/Continue distinction is built on HA's native `continue_on_error: true` action flag as the foundation. Silent/Log/Alert tiers add notification and logging behavior on top of this. | The main place it shows up in the Leader is handling how failed calls to followers process. It is also supported on the follower script itself via `FEATURE_NAME error mode:` labels, where it controls how script call errors are handled. |

> [!NOTE] Note
> FEATURE_NAME (Enable|Disable): A_STRING

### Follower Labels
 The order here matches the evaluation order in the automation. This is helpful to understand when considering how multiple labels will interact. 
(Note: Double check this order is correct)

| Label Function                      | Value / Arg                                                                                                      | Function                                                                                                                                                                                                                       | Notes                                                                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enable \| Disable                   | A_STRING_HERE<br><br>Arg required                                                                                | When triggered and leader_enabled matches the label function, the follower is set to A_STRING_HERE                                                                                                                             | Will often have 2 labels if different values are needed when enabled / disabled                                                                           |
| Only                                | Enable\|Disable<br><br>Default: None/Both                                                                        | Will only run if the passed leader_enabled value matches the provided argument.                                                                                                                                                | When applied to both leaders and followers, both filters apply.                                                                                           |
| Invert                              | True\|False<br><br>Default: False                                                                                | If True will invert the follower's action. If the follower is passed leader_enable: on, then the follower will turn off.                                                                                                       | Invert applied to leaders modifies the trigger instead.                                                                                                   |
| (\|Not )Between                     | (<24_h_fmt>\|-):(<24_h_fmt>\|-)<br><br>Arg required                                                              | Will only trigger/run if the current time matches the one of the provided Between labels. An open end is represented with a -                                                                                                  | An entity can have more than one Between label. They will all be detected and evaluated with an or.                                                       |
| (Enable\|Disable) Script            | NAME_OF_SCRIPT_TO_CALL<br><br>Arg required                                                                       | Calls the named script with arguments provided from labels. If it starts with `automation.` or `scene.` simply trigger the automation and don't pass any variables<br><br>See the more detailed script section below for more. | A feature can only have one script, but leaders and followers can have multiple features.<br><br>Please see detailed script section for trigger behavior! |
| Script                              | NAME_OF_SCRIPT_TO_CALL<br><br>Arg required                                                                       | Similar to the above script functionality, the "Default" option.<br><br>See detailed script section for a complete description.                                                                                                |                                                                                                                                                           |
| ( \|Enable\|Disable) Arg FIELD_NAME | % <br><br>Where % is the value to pass into the script's field.<br><br>Also see substitutions for dynamic values | Adds the value (after being substituted if it's dynamic) to the script call paired with FIELD_NAME.                                                                                                                            |                                                                                                                                                           |
| Error Mode               | (Silent\|Log\|Alert\|Stop)                          | Controls how errors from script calls are handled on the follower. Mirrors the Leader Error Mode behavior: Silent (continue silently), Log (log to HA logs), Alert (send alert), Stop (propagate error and halt).              | Applied as `FEATURE_NAME Error Mode: stop` etc. on the follower entity. Overrides the Leader-level error mode for that specific follower's script calls.  |
| (no Enable\|Disable)     | A_STRING_HERE                                        | `FEATURE_NAME: value` — a fallback value label with no Enable/Disable qualifier. Acts as both an enable and disable value (sets the follower to this value regardless of leader_enabled direction). Overridden by explicit `Enable:` or `Disable:` labels if present. | Primarily seen in button/default-script patterns carried over to followers. Prefer explicit `Enable:` / `Disable:` labels when different values are needed per direction. |


## Automation Labels
Labels can be used to change the way the automation runs too! Right now this only supports changing `Error Mode`, but could potentially support more in the future. When 
```
Error Mode: (Silent|Log|Alert|Stop)
```
is applied to the Labeled Leader Automation, it sets the default Error Mode. It will be overridden by Error Mode labels on a Feature at the Leader level.

> [!NOTE] Implementation Note
> The Stop/Continue distinction in Error Mode is built on HA's native `continue_on_error: true` action flag. In the current implementation, `continue_on_error: true` is used for all error modes (HA YAML does not support templating this flag dynamically). For `Stop` mode, the error is captured and a manual `stop: error: true` is called immediately after - achieving the same halting behavior while also allowing any log/alert actions to execute first. For `Silent`/`Log`/`Alert` modes execution continues after the error is handled. The Silent/Log/Alert tiers layer on top by suppressing, logging, or notifying about the error accordingly.

---


# Running Custom Scripts, Automations, and Scenes 
When more logic and customization is needed scripts, automations, and scenes can all be triggered by features. They can be the scripts created by these blueprints, or users can create and use their own. This section documents all the things you'll need to know to call and to write to those domains using labels. 

The primary labels used for scripts are:
```
FEATURE_NAME_HERE (Enable|Disable) Script: script.NAME_OF_SCRIPT_TO_CALL
FEATURE_NAME_HERE (Enable|Disable) Arg FIELD_NAME: %
FEATURE_NAME_HERE Script: script.NAME_OF_SCRIPT_TO_CALL
FEATURE_NAME_HERE Arg FIELD_NAME: %
```

> [!NOTE] Note
> Even though the label contains `Script` this applies to automations and scenes as well. Throughout this section I refer to scripts generically, and it should work the same for automations and scenes, they just don't accept the Arg label.

## Default Script vs Enable|Disable
Scripts can be triggered in 2 different styles. They're both useful, but for different purposes, so it's important to understand which to use. They can be applied to both Leaders and Followers with similar behavior. The biggest thing is that detected features take priority over a default script and will prevent the default from running.
### Explicit Enable|Disable 
This will call the script only when the feature leader matches the Enable or Disable state. It's the most basic and explicit choice and will work the same in both contexts. It will run regardless of what other features are labeled and detected.

### Default Script Leader
A default script will fire on feature mapping in the form of labels in the format `FEATURE_NAME: state_value`. Features in this form are processed **before** default script processing. If a feature & state in that form is found, it's processed as it should be and the default script **is skipped**. This enables buttons to use a base script and apply labels to customize one or more button actions.

### Default Script Follower
Because a follower doesn't really accept a state_value; the leader passes leader_enabled. So in this context it really operates as a "both" leader_enabled: true and false for the feature follower... Though it can be overridden if a feature is found as described in Default Script Leader.


## Passing Arguments to Scripts
Scripts by themselves are helpful, but what really makes them shine is when they have context. The preferred way to get this context into scripts is by passing arguments into fields. The way the automation does this is by:
- Getting all of the Args on the follower for the given Feature
	- For each Arg, get the FIELD_NAME and value
		- If the field exists on the script, add the field and value to the list of args
		- Otherwise trigger Error Mode
	- Detect and if present add the following to the list of args
	  If they aren't found in the script, it's assumed they aren't needed and no Error Mode handling is needed.
		- feature
		- scope
		- scope_id
		- follower_entity_id
		- leader_entity_id
		- leader_enabled
- Use these args as fields in the call to the script.

### Missing fields & Error Mode
The automation will detect if a follower has an Arg FIELD_NAME where the script doesn't have a corresponding FIELD_NAME. It will then take the corresponding `Error Mode` action(s) and stop or continue as specified.

### Argument Substitutions 
One big thing to be aware of when using scripts specifically is how the argument substitution works. It's currently very limited and only works on the Arg label and can only reference Features & Leaders, but it does allow for dynamic values to be passed via labels. 

Format:
```
FEATURE_NAME_HERE (Enable|Disable) Arg FIELD_NAME: [leaders].[feature_leader].[current_value]
FEATURE_NAME_HERE (Enable|Disable) Arg FIELD_NAME: [features].[feature_name].[enabled]
```

When evaluating the value to pass:
- Get the relevant attribute from Labeled Features State. Currently I only reference `(leaders|features)` but other attributes can be added and used. 
- Parse that attribute as JSON
- Get the `(feature_leader|feature_name)` object. When those values are used they are expected to return the feature_leader entity_id and feature_name being actually being used. 
- Get the `(current_value|enabled)` result. Again, these are what I currently reference, other fields could be utilized or added. For `leaders`, the available fields are `current_value`, `previous_value`, `last_changed_timestamp`, and the nested `features` dict. For `features`, the available fields are `leader_entity_id`, `value`, `enabled`, and `timestamp`.
- Assign this as the value to pass into the script.

> [!NOTE] TODO
> Looking for suggestions and ideas on how to make parsing less gross? Maybe regex groups.

## Best Practices
When just labels, it's pretty hard to stray from the intended use. With scripts that's a whole different story. Users are welcome to go about scripts anyway they wish (I'm curious to see the possibilities!), but this is a list of practices I try to ad-hear to when working with scripts. 

> [!NOTE] Best Practice
> The script should aim to check the current state and bring it into alignment with what's desired rather than blindly turning things on or off
---

---


## Button Based Features
Some use cases don't make sense for an environment based trigger but instead are more suited for a button based solution. These can use labels and areas too! They all rely on scripts, so be familiar with that section, in particular the Default labeling as that allows for buttons to use a default set of actions while allowing the user to easily override one or more if desired.


### Media Functions
- play/pause
- next
- previous
  
- mute/unmute
- volume up
- volume down
   
- task screen on/off
- input select


### Light Functions
The `labeled_feature_follower` script supports the `light` domain in its direct-value path. When a value label such as `FEATURE_NAME enable: 75` is present on a light entity, it calls `light.turn_on` with `brightness_pct` set to that value (clamped to 0–100). Lights without a numeric value label fall through to the turn_on/turn_off fallback path.

- light on/off 
- light up
- light down
  
- task light on/off
- night on/off

### Night Functions
There are a couple additional scripts that are used to support night time / sleep timeouts when using the buttons. When configuring the buttons, I integrate awareness of if media is playing or not, as well as if it's in night mode. This allows a small 2 button device (with double press and holds) to support a tremendous number of functions. 

I utilize these by checking for the conditions in the button scripts. First by seeing if media is playing, then calling the relevant media / light functions, and if it's night mode the sleep timer reset or cancel script.

The sleep timeout script (`script.labeled_feature_sleep_timeout`) uses `mode: restart`, so calling it again always resets the full countdown from zero. It runs the following steps:

1. Capture original volumes for all area media players.
2. Wait the configured timeout (default 15 minutes).
4. Halve the volume on every area media player.
5. Wait 1 minute.
6. Mute all area media players.
7. Wait 1 minute.
8. Seek back 30 seconds every 30 seconds × 20 iterations (≈ 10 minutes) — keeps playback position near where the user fell asleep.
9. Unmute all area media players.
10. Restore each media player to its original volume level.

The Sleep Timeout Cancel Restore automation watches for `script.labeled_feature_sleep_timeout` to transition from `on` to `off`. If `trigger.from_state.attributes.original_volumes` is non-empty (i.e. the script was stopped before normal completion), it reads the stored volumes directly from the script's prior state attribute, unmutes all area players, and restores each to its original volume level. No `input_text` helper is required - volumes are stored entirely in the script's `original_volumes` top-level variable attribute while it runs.

> [!NOTE] Warning
Because only 1 instance of the script can run at once, this means you'll need to create a separate automation/blueprint/labels for each user who wants to utilize the sleep functionality. It'd be great to find a way to eliminate this pain point.


- When Playing
	- lights off, background music off & reset sleep timer 
	- pause & cancel sleep timer
	- (double) go back 30 seconds & reset sleep timer - should 30 be dynamic?
	- (double) go forward 30 seconds & reset sleep timer - should 30 be dynamic?
	- (hold) volume up & reset sleep timer 
	- (hold) volume down & reset sleep timer

- Not Playing
	- lights off & cancel sleep timer
	- play & reset sleep timer
	- (double) previous track
	- (double) next track
	- (hold) Ad-Toggle
	- (hold) night mode on/off



## Audio Modes
The audio script runs any time one of the leaders changes, so it has to check the current state and update any entities that might need changing. 

### Audio Control
Triggers: Audio Leaders
These are the steps the script goes through:
- Check for "Audio Player" on people. For each person,
	- If there isn't a sensor.floor_audio_mode
		- Create it
	- Get the audio_mode and follow the case block
		- All
			Unmute all speakers
		- None
			Mute all speakers
		- Area Presence: Most Recently Changed
			- Get the state & area of most recently changed leader
			- If current area has veto sensor enabled (media player, phone call/playing)
				- exit
			- Update the follower(s) in the area
		- Floor Presence: Force Refresh
			- If current floor has veto sensor enabled (media player, phone call/playing)
				- exit
			- Get all leaders
				- Update the area followers to match area leader		
		- Individual Area / For each person
			- Get each person's current & past room
			- If current room has veto sensor enabled (media player, phone call/playing)
				- exit
			- Update current room's speaker source
			- Enable current room's speaker
			- Wait 10? seconds
			- Disable past room's speaker

```
Audio Leader
Audio Veto Sensor
Audio Loud Sensor
Audio Ad Sensor
Audio Follower
...


```

### Audio Mood Play
Triggers: Audio Veto Sensor, sensor.audio_mood 
Steps
- if person's media_player isn't playing
  or Area Presence area's have veto sensor enabled
  or Floor Presence veto sensor enabled
  or Individual Area veto sensor enabled
	- exit
- play audio_mood

Audio Mood Update
Triggers: 6, 9, 12, 5, 8
Steps
- Set the mood based on time... maybe use scheduler? Maybe that's where it's coming from!
	
sensor.audio_mood should consist of all playlists in lms... Or maybe a folder?

## Loud Sensor 
 A typical Leader/Follower 
 Follower On: 75
 Follower Off: 50
But what if multiple follower! Actually needs to be:
Loud Follower On: 75
Load Follower Off: 50
## Ad detection
Binary sensor Ad Leader
Media Player Follower
Follower On: Input without Ad stream
Follow Off: Input with Ad stream
LnxLink Local Script 
Follower On: Alt+Tab, Space
Follower Off: Space, Alt+Tab
LnxLink Remote Script 
Follower On: Space or Play/Pause
Follower Off: Space or Play/Pause

