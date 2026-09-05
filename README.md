# Investment Growth Calculator

**[Open the calculator →](https://raghu-nayak.github.io/investment-calc/)**

What a lump sum plus regular contributions grows to — after fees, after tax on
earnings, in today's money or in actual dollars — with the balance broken into
what you put in, what your capital earned, and what those earnings went on to
earn.

A single self-contained HTML file — no build step, no dependencies, no network calls.
Open it from disk or publish it to GitHub Pages and it behaves identically.

Design system and interaction patterns are shared with its siblings,
[au-fire-calculator](https://github.com/raghu-nayak/au-fire-calculator) (the
earliest you could stop working, under Australian rules) and
[au-leverage-calculator](https://github.com/raghu-nayak/au-leverage-calculator)
(debt recycling, borrowing to invest and margin loans, each measured against not
borrowing at all); the colour scheme comes from
[mortgage.monster](https://mortgage.monster/), and the feature set is modelled on
the [Fidelity Canada growth calculator](https://www.fidelity.ca/en/growthcalculator/).

## Run it locally

Double-click `index.html`, or:

```sh
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

There is nothing to install and no server to start — everything (charts included) is
inline, so `file://` works exactly like `https://`.

## Publish to GitHub Pages

**On a new repo**

```sh
git init
git add index.html README.md
git commit -m "Investment growth calculator"
git branch -M main
git remote add origin git@github.com:<you>/<repo>.git
git push -u origin main
```

Then in the repo: **Settings → Pages → Build and deployment → Source: Deploy from a
branch**, branch `main`, folder `/ (root)`. The page appears at
`https://<you>.github.io/<repo>/` within a minute or so.

**On your user site** — copy `index.html` into the root of your `<you>.github.io`
repo and push; it is then live at `https://<you>.github.io/`. To keep it alongside
other pages, put it in a subfolder instead (`/growth/index.html` →
`https://<you>.github.io/growth/`).

No Jekyll configuration is needed. If you ever add a folder starting with an
underscore, add an empty `.nojekyll` file at the repo root.

## What it calculates

| Input | Meaning |
| --- | --- |
| Initial investment | Lump sum at time zero |
| Additional contribution | Paid monthly or yearly, at the start or end of each period, optionally rising with inflation |
| Time to grow | 1–60 years |
| Rate of return | Annual, before fees and tax, compounded monthly / quarterly / half-yearly / yearly |
| Annual fee (MER) | Charged on the balance, the way a fund or platform fee is |
| Inflation rate | Used both for "today's dollars" and for indexing contributions |
| Tax on earnings | Applied to investment earnings as they accrue — leave at 0% for a tax-sheltered account |

The simulation runs monthly. With `A = (1 + rate/m)^m` as the gross annual factor:

- monthly factor after fees, before tax: `gm = (A × (1 − fee))^(1/12)`
- monthly factor after tax: `fm = 1 + (gm − 1) × (1 − tax)`
- effective annual return: `ra = fm^12 − 1`

**Simple earnings** are what the returns would have paid if nothing were ever
reinvested — `capital × ra × time`, accrued linearly. **Compound earnings** are
everything above that: the returns your returns went on to earn. Together with the
amount invested they always sum to the balance, which is why the stacked area chart
can be read as a straight decomposition of the total.

`Today's money` divides every figure by `(1 + inflation)^t`, so a 40-year balance is
comparable with money in your pocket now. Each year is discounted on its own date, not
by a single factor for the whole run.

While `Actual money` is selected, the growth chart also draws that discounted balance as
a dashed neutral line across the stack: the gap between it and the top of the stack is
what inflation takes. It is a reference mark rather than a fourth series, so it wears an
ink colour, is named in the legend and the right-hand gutter, and appears in the
crosshair tooltip. It is hidden when inflation is `0` (it would sit on the total) and in
`Today's money` mode (the stack already *is* that line).

Slider ranges and typed caps scale with the selected currency, so the maxima stay
sensible in rupees and yen rather than topping out at a million. Rupee amounts are
grouped and abbreviated the Indian way — `5,00,00,000` and `₹5Cr` / `₹5L` — as you type
and on the chart axes.

## Things worth knowing

- **Every setting lives in the URL.** Copy the link and the exact scenario travels
  with it; the page also remembers your last scenario in `localStorage`.
- **Pin as baseline** freezes the current result as a dashed line on the chart, so you
  can see what a change to one assumption actually costs or buys.
- **CSV** exports the assumptions plus the full year-by-year table.
- **Print** renders on a light ground, one scenario per page.
- **On a phone, a chart readout stays put** when you lift your finger, until you tap
  somewhere else — a touch pointer is destroyed on release, so hiding on `pointerleave`
  the way a mouse does would wipe the readout the tap had just asked for.
- **Up and down nudge any number field** by exactly what its own slider moves,
  with `Shift` for ten of those, so the thumb and the number can never drift
  apart — a range input snaps whatever you assign it onto its step grid, and a
  half-notch nudge would leave the thumb pointing at a figure the field isn't
  showing. That carries the currency for free, since the slider steps are already
  scaled: initial moves in 1,000s, or 100,000s in yen. The step lands on a
  multiple of itself, so 12,340 goes to 13,000 rather than 13,340.
- Charts are hand-drawn SVG with a crosshair tooltip, keyboard navigation
  (arrow keys, `Shift` for a year at a time), a legend, direct labels and a table view
  — so no value is reachable only by hovering. The optional pattern fills cover
  colour-vision deficiency, greyscale printing and forced-colors mode.

## Customising

Everything visual is a CSS custom property in the `<style>` block at the top of the
file — `html[data-theme="dark"]` and `html[data-theme="light"]`. The three chart
series colours are `--s1` / `--s2` / `--s3`; they were chosen to clear an OKLCH
lightness band, a chroma floor, colour-vision-deficiency separation and 3:1 contrast
against each theme's chart surface, so if you change them, keep those properties.

Default input values live in the `DEFAULTS` object in the script. An arrow key
moves a field by its slider's own `step`; `STEPS` is only the fallback for a
field with no slider.

- `APP_VERSION` — the version shown in the footer and written into the CSV
  header. The footer also carries it as a literal so it still prints on a page
  whose script never ran, and a test holds the two to the same figure. Bump it
  in the same commit as the change it describes: patch for wording, styling or a
  corrected figure, minor for a new input, mode or chart, major for a change that
  makes an existing shared link read differently.

## Tests

The engine between the `engine:start` and `engine:end` markers is pure — no DOM,
no globals, no display logic — so it can be pulled out of the page and run in
node:

```sh
node test.js index.html
```

68 assertions: contributions falling in the right months and indexing once a
year rather than once a month, the balance checked against the closed form for
both yearly and monthly compounding, the effective return after fees and tax,
every yearly row closing on what it opened with plus the flows, the three chart
bands always rebuilding the balance exactly, simple earnings holding to the
return paid on capital alone, a fee with no return putting you under what you
paid in, the deflator discounting each point on its own date, and a sweep of
every combination the sliders reach staying finite and adding up.

## Disclaimer

**This calculator is provided for general information and educational purposes only.
It is not financial, investment, tax or legal advice.** It takes no account of anyone's
objectives, financial situation or needs, and nothing in it is a recommendation to
acquire, hold or dispose of any investment or financial product.

The results are **hypothetical illustrations** generated solely from the figures
entered. They assume a constant rate of return, which no real investment delivers;
actual returns vary, may be negative, and past performance is no guide to future
performance. The calculations ignore transaction costs, brokerage, bid–ask spreads,
contribution and concessional caps, product-specific rules, and the particulars of any
individual tax position. No result should be treated as a projection, forecast or
guarantee.

**The tool is provided "as is", without warranty of any kind**, express or implied,
including without limitation any warranty of accuracy, completeness, reliability,
merchantability or fitness for a particular purpose. To the maximum extent permitted by
law, the author and any distributor accept **no responsibility or liability whatsoever**
for any error, omission, defect or inaccuracy in the calculations, content or output,
nor for any loss or damage — direct, indirect, consequential or otherwise — arising from
use of, or reliance on, this tool. It is used entirely at your own risk, and you are
responsible for verifying any figure before acting on it.

Before making any financial decision, seek advice from a licensed financial adviser,
accountant or other qualified professional who can consider your individual
circumstances.

Copyright &copy; 2026 Raghu Nayak. All rights reserved. The source is published
here to be read and checked, not to be reused or redistributed.
