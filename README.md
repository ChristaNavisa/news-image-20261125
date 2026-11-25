# The World in One Day

[![The World in One Day](https://make.fun/badge/news-image-20261125.svg)](https://make.fun/bounty/news-image-20261125)
[![Rank](https://make.fun/badge/news-image-20261125/ChristaNavisa/news-image-20261125/rank.svg)](https://make.fun/bounty/news-image-20261125)
[![Reward](https://make.fun/badge/news-image-20261125/ChristaNavisa/news-image-20261125/reward.svg)](https://make.fun/bounty/news-image-20261125)

One front page summing up Wednesday, 25 November 2026 in a single image:
52 dated stories — Shenzhou-24 lead hero (first Pakistani astronaut reaches
Tiangong), 8 panels, a world map with 9 pins, and the full 52-story list.

`main.ts` draws the 1024x1024 page with a stdlib-only PNG encoder and a
fresh 5x7 bitmap font, and writes `/output/entry.png` deterministically
(byte-identical on every run).

Page sections: masthead ("THE WORLD IN ONE DAY", Wednesday, 25 November
2026), Shenzhou-24 lead hero, stat strip (52 stories / 6 regions / 9 map
pins), 8 panels, a world map with 9 numbered pins (Jiuquan, Hormuz, Riyadh,
Gaza, Kyiv, Blue Nile, Cartagena, West Java, Vatican City), and the full
52-story list in two columns.
