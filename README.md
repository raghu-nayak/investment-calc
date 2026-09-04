# Investment Growth Calculator

A single self-contained HTML file — no build step, no dependencies, no network calls.
Open it from disk or publish it to GitHub Pages and it behaves identically.

Features are modelled on the [Fidelity Canada growth calculator](https://www.fidelity.ca/en/growthcalculator/);
the colour scheme is taken from [mortgage.monster](https://mortgage.monster/).

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
- **Up and down nudge any number field** by the smallest amount worth thinking
  about — 500 for money, a year, 0.1 of a point for a rate, and 50 for the
  contribution — with `Shift` for ten of those. Money steps ride the currency
  scale, so a yen field moves in 50,000s. The step lands on a multiple of itself,
  so 12,340 goes to 12,500 rather than 12,840.
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

Default input values live in the `DEFAULTS` object in the script, and how far one
press of an arrow key moves a field lives in `STEPS` (by kind) and `KEY_STEPS`
(by name, for the fields that want their own).

## Sibling tools

Same design system, same one-file-no-dependencies rule:

- [au-fire-calculator](https://github.com/raghu-nayak/au-fire-calculator) — the
  earliest you could stop working, under Australian rules
- [au-leverage-calculator](https://github.com/raghu-nayak/au-leverage-calculator) —
  debt recycling, borrowing to invest and margin loans, measured against not borrowing

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
