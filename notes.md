# Boss DR-670 sysex dump format

Each sysex command starts with `F0 41`, where `41` is the Roland manufacturer ID, and ends with `F7`.

## Data payload header

Seems to be same for each sysex message.

`10 00 41 12`

| byte | description             |
| ---- | ----------------------- |
| `10` | Device ID               |
| `00` | Model ID                |
| `41` | Roland manufacturer ID? |
| `12` | Set parameters          |
| ...  | rest of the payload     |

## Payload structure

`cc nn 00 i1 i2 dd ... hh`

| byte   | description                                          |
| ------ | ---------------------------------------------------- |
| `cc`   | Address (command)                                    |
| `nn`   | Index (song/pattern/drumkit/etc. number, zero-based) |
| `00`   | Seems to be always zero                              |
| `i1-2` | Offset, see below                                    |
| `dd`   | Data (the actual payload)                            |
| `hh`   | Checksum, see below                                  |

Offset: Mostly `00`, except: `00 01` in `70` end command; Used as indexing when data payload is large and split into multiple payloads: packet 0: `00 00`, 1: `01 60`, 2: `03 40`, 3: `05 20`

Checksum: sum everything from `cc` to end of `dd`, divide by 128, subtract remainder from 128. [Source](http://www.chromakinetics.com/handsonic/rolSysEx.htm)

## 70: Start/end dump

Index: `00`

Data (start):
`00`: All
`01`: Seq
`02`: Kit
`03`: Util

Data (end):
`00`: End

## 10-11: Song

Index: song number, `00` corresponds to song 1

### 10: Song metadata

TBD: Initial tempo, song chain

### 11: Pattern list

Sequence of 3 byte structs:

`tt pp 00`

`tt`: pattern type: 02 for preset, 00 for user
`pp`: pattern index

Sequence is terminated with `7f 7f 03`.

## 20-22: Pattern

Index: pattern number, `00` corresponds to 201 (first user pattern)

21 and 22 can be repeated when data is larger than 230 bytes (incl. payload header). See indexing in payload header.

### 20: Pattern metadata

`bb mm kk tt ??`

| byte | description                                                                 |
| ---- | --------------------------------------------------------------------------- |
| `bb` | Beat (time signature); 00-06: 2/4 - 8/4; 07-13: 4/8 - 16/8                  |
| `mm` | Measure: 1 or 2                                                             |
| `kk` | Drumkit index                                                               |
| `tt` | Key transpose: -12 to +12 in 7-bit two's complement, e.g. 7d = -3, 0c = +12 |

### 21: Pattern data

Sequence of 7 byte structs

`oo mm tt vv ?? ll fg`

| byte | description                                                 |
| ---- | ----------------------------------------------------------- |
| `oo` | Next note time offset: see below                            |
| `mm` | Midi note starting from 0x24 = C1 = Kick                    |
| `tt` | Instrument type: drum = 10, bass = 11                       |
| `vv` | Velocity, max 7f                                            |
| `??` | TBD, related to long notes, some sort of offset bits or MSB |
| `ll` | note length                                                 |
| `fg` | see below                                                   |

`f`

| bit (76543210) | description                         |
| -------------- | ----------------------------------- |
| 0              | 1: no op (advance time offset only) |
| 1              | 1: add 0x80 to offset               |

`g`

| bit (76543210) | description             |
| -------------- | ----------------------- |
| 0              | ?                       |
| 2              | 1: flam (for drum only) |

Rest of the bits appear unused.

Sequence ends with `00 0f 00 00 00 00 10`.

Note that pattern may contain more note data than what is actually played. For example, the full pattern remains in memory although a pattern copied and then modified to be 1 measure instead of 2 measures. I.e. "measure" and "beat" dictate the length of what is played, not the data itself.

#### Next note time offset

Time in 1/96ths of a quarter duration, e.g. `0x18`: 16th note; `0x30`: 8th note. `00` means play the next note simultaneously with this one.

Max value is `7f`, which means that if the note (or pause) is longer than about 1.32 quarters (without any other notes in between) there will be "empty" notes added in between and/or the extension bit `f`(1) is used to lengthen the offset.

### 22: Fill pattern data

Works the same as pattern data. Does not have separate header so general settings like time signature and measure are shared.

If there's no fill for a pattern, the data is only the sequence end marker.

## 24-26: TBD

Index: `00`-`63`

## 30: Drumkit

Index: zero indexed drumkit number, `00` corresponds to 65 (first user drumkit)

## 40: Util (Midi mode, DPP)

TBD
