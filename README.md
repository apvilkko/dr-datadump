# dr-datadump: Boss DR-670 import/export tooling

**DISCLAIMER**: Using this software on your Boss DR device is at your own risk. Accept that you are sending sysex data which is manipulated by software. Faulty data shouldn't brick your device but there's no guarantee. This software is experimental and created for my personal interest.

See notes.md for Boss DR-670 sysex dump description.

## Intro

This repository contains software which can

- import the contents of your Boss DR-670, meaning it can analyze the sysex data obtained by doing a MIDI bulk dump on your device
- export song data from your desktop machine (in midi format) to your Boss DR-670

Why? I thought it would be fun to create songs/backing tracks on a PC DAW (instead of the clunky on-device interface), export them to MIDI and have them automatically converted to Boss DR sequence format.

## How to

The software is written in Node.js so you'll need `node` installed (I guess >v14 is enough).

Installation:

1. Get the contents of this repository to your machine.
2. In this folder, run `npm install`

Usage:

Prefer the `SEQ` option in the DR-670 MIDI TX BULK menu to dump only the sequencer data (songs/patterns) since that's the only thing currently supported by this software. Dumping `ALL` is fine also but there's a lot of useless data transmitted back and forth in that case.

Sysex data can be captured to a file with e.g. [MIDI-OX](http://www.midiox.com/).

To "import"/analyze/decode a sysex dump file:

`npm run decode path_to_sysex_file.syx path_to_output_file.txt`

The command will create an output txt file.

To "export" a song to a new sysex file:

`npm run export path_to_song_folder your_existing_sysex_file.syx`

The first parameter is your song folder. See details below.
The second parameter is your existing sysex bulk dump file. This is needed so your existing data is not lost.

An output `.syx` file is created based on your song folder name. Before transmitting this sysex data back to your Boss DR, read the **DISCLAIMER** up top, and verify its contents by re-analyzing it with the `decode` command. It may be useful to do a diff with the original file analysis to see the differences.

### The song folder

To export a song you need in one folder:

File called `song.yaml`, which contains e.g. the following:

```
tempo: 86
startPattern: 250
startSong: 20
```

- tempo is the BPM of your song.
- startPattern denotes from which pattern number the new patterns should be created onwards
- startSong denotes which song number will be the resulting exported song

In addition to the yaml file, provide 2 \*.mid files in MIDI type 0 format (must be 96 PPQN, because this is what my Ableton Live exports, and it matches the DR-670 internal resolution).

One file should have `bass` in its filename somewhere, the other file is considered the drum track.

Example:

- song.yaml
- my_song_drums.mid
- my_song_bass.mid
