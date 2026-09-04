/* Unit tests for the growth engine.

   The engine is pure -- no DOM, no globals -- and sits between the
   engine:start and engine:end markers so it can be pulled out of the page and
   run in node:

     node test.js index.html
*/
var fs = require('fs');
var src = fs.readFileSync(process.argv[2] || (__dirname + '/index.html'), 'utf8');
var m = src.indexOf('/* --- engine:start --- */'), n = src.indexOf('/* --- engine:end --- */');
if (m < 0 || n < 0) throw new Error('engine markers not found');
var code = src.slice(m, n);
var api = new Function(code + '\nreturn {clamp:clamp,contribFor:contribFor,simulate:simulate};')();

var pass = 0, fail = 0;
function near(a, b, tol){ return Math.abs(a - b) <= (tol == null ? 0.5 : tol); }
function ck(name, got, want, tol){
  if (near(got, want, tol)){ pass++; }
  else { fail++; console.log('FAIL  ' + name + '\n      got ' + got + '  want ' + want); }
}
function ckTrue(name, cond, extra){
  if (cond){ pass++; }
  else { fail++; console.log('FAIL  ' + name + (extra != null ? '  [' + extra + ']' : '')); }
}
function head(s){ console.log('\n' + s); }

/* Rates arrive as decimals here; the page divides by 100 in params(). */
var BASE = {
  initial: 10000, contrib: 500, freq: 12, timing: 'begin', indexContrib: false,
  years: 25, rate: 0.07, compounding: 1, fee: 0.002, inflation: 0.025, tax: 0
};
function P(o){ return Object.assign({}, BASE, o || {}); }
/* the plainest possible run: one lump, nothing taken out of it */
function LUMP(o){ return P(Object.assign({ contrib: 0, fee: 0, tax: 0 }, o || {})); }

/* ------------------------------------------------------ contributions */
head('what is paid in, and when');

ckTrue('nothing set aside pays nothing', api.contribFor(P({ contrib: 0 }), 1) === 0);
ck('monthly pays every month', api.contribFor(P(), 7), 500);
ck('and keeps paying in later years', api.contribFor(P(), 100), 500);

var YB = P({ freq: 1, timing: 'begin' });
ck('yearly at the start pays in month one', api.contribFor(YB, 1), 500);
ck('and again in month thirteen', api.contribFor(YB, 13), 500);
ck('but not in between', api.contribFor(YB, 7), 0);

var YE = P({ freq: 1, timing: 'end' });
ck('yearly at the end pays in month twelve', api.contribFor(YE, 12), 500);
ck('and again in month twenty-four', api.contribFor(YE, 24), 500);
ck('and nothing in month one', api.contribFor(YE, 1), 0);

ck('unindexed contributions never move', api.contribFor(P(), 37), 500);
ck('indexed ones rise once a year, not once a month',
   api.contribFor(P({ indexContrib: true }), 13), 500 * 1.025, 1e-9);
ck('and hold flat within the year',
   api.contribFor(P({ indexContrib: true }), 24), 500 * 1.025, 1e-9);
ck('three years in, they have compounded three times',
   api.contribFor(P({ indexContrib: true }), 37), 500 * Math.pow(1.025, 3), 1e-9);

/* --------------------------------------------------- against a formula */
head('the balance, against the closed form');

var lump = api.simulate(LUMP({ years: 10 }));
ck('a lump sum compounded yearly is the textbook figure',
   lump.total.bal, 10000 * Math.pow(1.07, 10), 1e-6);
ck('and nothing but the lump was ever invested', lump.total.invested, 10000);
ck('so the earnings are the rest of it',
   lump.total.earnings, 10000 * Math.pow(1.07, 10) - 10000, 1e-6);
ck('the run is exactly twelve months a year', lump.months, 120);
ck('with a point at the start as well as at every month', lump.pts.length, 121);
ck('and one row a year', lump.years.length, 10);

var mth = api.simulate(LUMP({ years: 1, rate: 0.06, compounding: 12 }));
ck('monthly compounding is a flat half a per cent a month',
   mth.total.bal, 10000 * Math.pow(1.005, 12), 1e-6);
ckTrue('which is more than the same rate compounded once',
  mth.total.bal > api.simulate(LUMP({ years: 1, rate: 0.06, compounding: 1 })).total.bal);
ck('the gross annual factor is reported as that same figure',
   mth.grossAnnual, Math.pow(1.005, 12) - 1, 1e-12);

ck('with no fee and no tax the effective return is just the return',
   api.simulate(LUMP()).ra, 0.07, 1e-12);
ckTrue('a fee comes off it', api.simulate(P({ tax: 0 })).ra < 0.07);
ck('and the pre-tax figure it reports is the fee applied to the gross factor',
   api.simulate(P()).netAnnualPreTax, 1.07 * (1 - 0.002) - 1, 1e-12);

var taxed = api.simulate(P({ fee: 0, tax: 0.5 }));
ck('tax on earnings halves the monthly growth',
   taxed.ra, Math.pow(1 + (Math.pow(1.07, 1 / 12) - 1) * 0.5, 12) - 1, 1e-12);

/* ---------------------------------------------------------- the ledger */
head('every dollar accounted for');

var run = api.simulate(P({ years: 12, indexContrib: true, tax: 0.15 }));

ckTrue('each year opens where the last one closed', run.years.every(function(y, i){
  return i === 0 || near(y.start, run.years[i - 1].end, 1e-6);
}));
ckTrue('and closes on what it started with, plus the flows', run.years.every(function(y){
  return near(y.end, y.start + y.contrib + y.gross - y.fee - y.tax, 1e-6);
}));
ckTrue('the net figure on a row is the same subtraction', run.years.every(function(y){
  return near(y.net, y.gross - y.fee - y.tax, 1e-9);
}));

ck('what went in is the lump plus every contribution',
   run.total.invested,
   10000 + run.years.reduce(function(a, y){ return a + y.contrib; }, 0), 1e-6);
ck('the earnings are what is left over',
   run.total.earnings, run.total.bal - run.total.invested, 1e-9);
ck('the fees add up to the total reported',
   run.total.fees, run.years.reduce(function(a, y){ return a + y.fee; }, 0), 1e-6);
ck('and so does the tax',
   run.total.tax, run.years.reduce(function(a, y){ return a + y.tax; }, 0), 1e-6);

ckTrue('the three bands always rebuild the balance exactly', run.pts.every(function(pt){
  return near(pt.b1 + pt.b2 + pt.b3, pt.bal, 1e-6);
}));
ck('simple and compound earnings together are the earnings',
   run.total.simple + run.total.compound, run.total.earnings, 1e-6);
ckTrue('and neither of them is ever negative',
   run.total.simple >= 0 && run.total.compound >= 0);
/* Without a figure to hold it to, the split between the two kinds of earnings
   is free to be wrong in a way the totals still hide: whatever simple does not
   claim, compound absorbs. On a lump sum it has a closed form -- the return paid
   on the capital alone, once a year, never reinvested. */
var split = api.simulate(LUMP({ years: 10 }));
ck('simple earnings are the return on capital alone, accrued flat',
   split.total.simple, 10000 * 0.07 * 10, 1e-6);
ck('and compound earnings are everything the returns went on to earn',
   split.total.compound, 10000 * Math.pow(1.07, 10) - 10000 - 7000, 1e-6);
ck('over a single year nothing has compounded yet',
   api.simulate(LUMP({ years: 1 })).total.compound, 0, 1e-6);
ckTrue('compounding is the larger share over a long run',
   api.simulate(P({ years: 40 })).total.compound > api.simulate(P({ years: 40 })).total.simple);

/* ------------------------------------------------- degenerate settings */
head('the cases with nothing in them');

var flat = api.simulate(P({ rate: 0, fee: 0, tax: 0, years: 1, contrib: 100 }));
ck('a nil return leaves you exactly what you paid in', flat.total.bal, flat.total.invested, 1e-9);
ck('which is the lump plus twelve payments', flat.total.invested, 10000 + 1200, 1e-9);
ck('and no earnings at all', flat.total.earnings, 0, 1e-9);
ck('so nothing is under water either', flat.total.under, 0, 1e-9);

var eaten = api.simulate(P({ rate: 0, fee: 0.02, tax: 0, years: 5 }));
ckTrue('a fee with no return puts you under what you paid in',
  eaten.total.bal < eaten.total.invested);
ck('and that shortfall is what "under" reports',
   eaten.total.under, eaten.total.invested - eaten.total.bal, 1e-6);
ck('with no earnings to split, both bands are empty',
   eaten.total.simple + eaten.total.compound, 0, 1e-9);

ck('a single year still runs', api.simulate(P({ years: 1 })).years.length, 1);
ckTrue('and a zero starting balance is fine',
  isFinite(api.simulate(P({ initial: 0 })).total.bal));

/* ------------------------------------------------------------ direction */
head('which way each lever moves it');

function bal(o){ return api.simulate(P(o)).total.bal; }
ckTrue('a higher return leaves more', bal({ rate: 0.09 }) > bal({ rate: 0.07 }));
ckTrue('a higher fee leaves less', bal({ fee: 0.01 }) < bal({ fee: 0.002 }));
ckTrue('tax on earnings leaves less', bal({ tax: 0.3 }) < bal({ tax: 0 }));
ckTrue('longer leaves more', bal({ years: 30 }) > bal({ years: 25 }));
ckTrue('a bigger contribution leaves more', bal({ contrib: 800 }) > bal({ contrib: 500 }));
ckTrue('indexing the contribution leaves more', bal({ indexContrib: true }) > bal({}));
ckTrue('paying at the start of the period beats paying at the end',
  bal({ freq: 1, timing: 'begin' }) > bal({ freq: 1, timing: 'end' }));
ckTrue('and monthly beats the same money once a year',
  bal({ freq: 12, contrib: 500 }) > bal({ freq: 1, contrib: 6000, timing: 'end' }));

/* --------------------------------------------------------- the deflator */
head("today's money");

var dfl = api.simulate(P({ years: 20, inflation: 0.03 }));
ck('a yearly row is discounted by whole years', dfl.years[9].defl, Math.pow(1.03, 10), 1e-12);
ck('a monthly point is discounted on its own date',
   dfl.pts[126].defl, Math.pow(1.03, 126 / 12), 1e-12);
ck('the two agree where they meet',
   dfl.pts[120].defl, dfl.years[9].defl, 1e-12);
ck('nil inflation discounts nothing',
   api.simulate(P({ inflation: 0 })).total.defl, 1, 1e-12);

/* ------------------------------------------------------------- sweeping */
head('nothing breaks anywhere on the dials');

var bad = [];
[0, 10000, 100000000].forEach(function(initial){
  [0, 500, 1000000].forEach(function(contrib){
    [0, 0.5].forEach(function(rate){
      [0, 0.05].forEach(function(fee){
        [0, 0.75].forEach(function(tax){
          [1, 12].forEach(function(compounding){
            [1, 60].forEach(function(years){
              var s = api.simulate(P({ initial: initial, contrib: contrib, rate: rate,
                fee: fee, tax: tax, compounding: compounding, years: years }));
              var t = s.total;
              if (!isFinite(t.bal) || !isFinite(t.invested) || !isFinite(t.earnings) ||
                  t.bal < 0 || t.invested < 0 || t.fees < 0 || t.tax < 0 ||
                  !near(t.simple + t.compound, Math.max(0, t.earnings), 1e-3) ||
                  s.years.length !== years)
                bad.push([initial, contrib, rate, fee, tax, compounding, years].join('/'));
            });
          });
        });
      });
    });
  });
});
ckTrue('every combination the sliders reach stays finite and adds up',
  bad.length === 0, bad.slice(0, 3).join(' '));

ckTrue('the same inputs always give the same answer',
  api.simulate(P()).total.bal === api.simulate(P()).total.bal);

/* ------------------------------------------------------- the version */
/* The colophon is plain HTML so it still prints on a page whose script never
   ran, which makes it a second copy of the version -- and a second copy drifts.
   Both are read straight out of the source rather than through the engine's
   exports, because neither belongs to the engine. */
head('the version, in the two places it is written');
var vFooter = /<span id="ver">v([0-9]+\.[0-9]+\.[0-9]+)<\/span>/.exec(src);
var vConst  = /var APP_VERSION = '([0-9]+\.[0-9]+\.[0-9]+)';/.exec(src);
ckTrue('the footer carries a semver literal', !!vFooter);
ckTrue('the code declares a semver constant', !!vConst);
ckTrue('and the two agree', !!vFooter && !!vConst && vFooter[1] === vConst[1],
  vFooter && vConst ? vFooter[1] + ' vs ' + vConst[1] : 'missing');
ckTrue('the CSV header is built from the constant, not a third literal',
  /L\.push\(\[APP_NAME \+ ' ' \+ APP_VERSION\]\)/.test(src));
ckTrue('the copyright names a holder and a year', /&copy;\s*20\d\d\s+\S+/.test(src));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
