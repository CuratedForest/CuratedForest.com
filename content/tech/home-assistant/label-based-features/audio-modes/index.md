---
title: Audio Modes
type: docs
weight: 50
author_reviewed: false
editor_reviewed: false
---

The audio script runs any time one of the leaders changes, so it has to check the current state and update any entities that might need changing. 

## Audio Control
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

## Audio Mood Play
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


{{< examples title="Example labels" >}}
