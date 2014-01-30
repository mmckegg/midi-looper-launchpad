midi-looper-launchpad
===

Launchpad control bindings for [midi-looper](https://github.com/mmckegg/midi-looper).

Used as a primary component of [Loop Drop](https://github.com/mmckegg/loop-drop-app).

## Install

```bash
$ npm install midi-looper-launchpad
```

## Example

Using in the browser with [web-midi](https://github.com/mmckegg/midi-looper-launchpad) and [bopper](https://github.com/mmckegg/bopper) clock.

```js
var Bopper = require('bopper')
var Ditty = require('ditty')
var MidiLooper = require('midi-looper')
var WebMidi = require('web-midi')
var Soundbank = require('soundbank')

var LaunchpadControl = require('midi-looper-launchpad')

// set up some support components to make midi-looper work
var audioContext = new webkitAudioContext()
var clock = Bopper(audioContext)
var playback = Ditty(clock)
var looper = MidiLooper(clock.getPosition)
var soundbank = Soundbank(audioContext)

// get a duplex stream for the launchpad
var midiStream = WebMidi('Launchpad', 0)

// pass the duplex midi stream and looper instance to the constructor
var launchpad = LaunchpadControl(midiStream, looper)

// now wire up the looper feedback loop!
playback.pipe(soundbank).pipe(looper).pipe(playback)
```

## Usage

The main grid outputs midi notes on channel 1 (message 144) from note 0 to 63. 

### Note Repeat

The **right side buttons** change the note repeat length (none, 1, 2/3, 1/2, 1/3, 1/4, 1/6, 1/8). When length selected, hold notes in the main grid, and they will repeat at the specified length.

### Store/Bounce

Press **up/learn** to loop the last 2 bars (by default) you just played.

### Suppress

Hold **down/view** to suppress all current playback. While holding you can press store/bounce (learn) to lock it in.

### Undo/Redo

The **page left/right** buttons control undo/redo and move between stored loops.

### Hold

Hold **inst/session** button to loop the current playback at whatever the repeat length is.

### Snap 1 and 2

Hold the **fx/user 1** and **user/user 2** buttons to playback the notes stored within. While holding you can press store/bounce (learn) to lock it in.

### Move/Copy/Select

While holding the **mixer** button, select a note or range of notes (hold down two buttons at the same time to get all notes in between), then any of the following:
  - press another note (moves the notes in the range)
  - hold the supress button (will mute notes in the selected range)
  - press the store (learn) button (will quantize to whatever grid specified by note repeat length)
