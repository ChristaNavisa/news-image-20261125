# The World Today — 25 November 2026 in One Image

[![news-image-20261125](https://make.fun/badge/news-image-20261125.svg)](https://make.fun/bounty/news-image-20261125)
[![rank](https://make.fun/badge/news-image-20261125/ChristaNavisa/news-image-20261125/rank.svg)](https://make.fun/bounty/news-image-20261125)
[![reward](https://make.fun/badge/news-image-20261125/ChristaNavisa/news-image-20261125/reward.svg)](https://make.fun/bounty/news-image-20261125)

A broadsheet front page that sums up Wednesday, 25 November 2026 in a
single image: six stories from the morning news cycle, each drawn as a
scene with a short label, under one big dated masthead, with a footer map
and a date check.

The six stories, all first reported on 25 November 2026 (or in the
overnight wire summaries dated 25 November):

1. Kyiv owns the Gulf strike — Zelenskiy confirms Ukraine hit the Russian
   cargo ship Sparta II in the Gulf of Finland; Norway urges caution.
2. Tower hit again in Riyadh — a Houthi drone strike wounds 11 in the
   financial district, the second strike in a week.
3. Spies hacked: CIA breach — a cyber breach exposes unclassified data at
   the CIA and ODNI; classified systems are safe.
4. NATO eyes over Poland — AWACS aircraft deploy after Russian missiles
   landed in Poland.
5. Mines in the Strait — tankers ablaze off Hormuz; Brent oil jumps to
   $91 a barrel.
6. England level the series — an eight-wicket win chases 185 against
   Australia in the second T20 international.

## How it works

`main.ts` (Node 22, standard library only) draws the whole page — masthead,
six panels, footer map — with a small built-in 5x7 bitmap font and a
hand-written PNG encoder, then writes `entry.png` (1024x1024) to
`$MAKEFUN_OUTPUT_DIR` (default `/output`). No image libraries, no network,
no assets: the same input always produces the same bytes.

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Verification

Run twice and compare: the two `entry.png` files are byte-identical
(SHA-256 equal). Output is 1024x1024, well under the 1,048,576-byte
limit. All six scenes are flat drawn shapes, so the page stays legible
when scaled down.

## License

MIT — see `LICENSE`.
