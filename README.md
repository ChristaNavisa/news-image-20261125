# The World in One Day — 25 November 2026 in One Image

[![news-image-20261125](https://make.fun/badge/news-image-20261125.svg)](https://make.fun/bounty/news-image-20261125)
[![rank](https://make.fun/badge/news-image-20261125/ChristaNavisa/news-image-20261125/rank.svg)](https://make.fun/bounty/news-image-20261125)
[![reward](https://make.fun/badge/news-image-20261125/ChristaNavisa/news-image-20261125/reward.svg)](https://make.fun/bounty/news-image-20261125)

A dense broadsheet front page that sums up Wednesday, 25 November 2026 in
a single image: 40 dated stories, every one of them from that day.

The page: a dated masthead and ticker, a stats line with region counts
(Europe 12, Middle East 5, Asia 5, Africa 1, Americas 17), a six-box stat
strip, one lead story (Shenzhou-24 lifts off with Pakistan's first
astronaut), eight more illustrated stories (China probes Politburo member
Chen Jinging; Huawei guilty of trade theft; Trump pardons turkeys; Nvidia
shares slide 6%; Houthi drone hits Riyadh tower; Kyiv owns the Gulf strike;
Real Madrid rout PSV 5-1; CIA hit by cyber breach), a world map with
numbered pins for the nine illustrated stories, a 31-item "also on
Wednesday" list, and a date check that names the near-miss stories left
out on purpose (23 Nov: Nvidia reinstates Huang, COP31 ends with no deal,
Ukraine sinks Russian warship off Libya; 24 Nov: Hormuz tankers hit mines,
Sanofi buys Insmed, Gaza strike kills Hamas security chief).

## How it works

`main.ts` (Node, standard library only) draws the whole page — masthead,
stat strip, lead, eight illustrated panels, map, story list, date check —
with a small built-in 5x7 bitmap font and a hand-written PNG encoder, then
writes `entry.png` (1024x1024) to `$MAKEFUN_OUTPUT_DIR` (default
`/output`). No image libraries, no network, no assets: the same input
always produces the same bytes.

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Changes in r2 (dense leap over r1)

r1 carried 6 stories in 19,820 bytes and scored 960.572 (#177/502). r2
keeps the same flat-colour bitmap-font craft but packs 40 dated stories
into the same 1024x1024 page: a lead, eight illustrated panels, a pinned
world map, a 31-item list, a six-box stat strip and a date check that
names the near-miss stories left out on purpose. Region counts on the
stats line are computed from the story data, never hand-counted.

## Verification

Run twice and compare: the two `entry.png` files are byte-identical
(SHA-256 equal). Output is 1024x1024, well under the 1,048,576-byte
limit. All scenes and the map are flat drawn shapes, so the page stays
legible when scaled down.

## License

MIT — see `LICENSE`.
