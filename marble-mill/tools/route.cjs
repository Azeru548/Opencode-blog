// Print the arc-length fraction at each ROUTE index, by reading the real
// ROUTE out of src/machine.js (no duplicated copy to drift out of sync).
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'machine.js'), 'utf8');
const m = src.match(/const ROUTE = (\[[\s\S]*?\]);/);
if (!m) { console.error('ROUTE not found'); process.exit(1); }
const ROUTE = eval(m[1]);

const cum = [0];
for (let i = 1; i < ROUTE.length; i++) {
  cum.push(cum[i - 1] + Math.hypot(ROUTE[i][0] - ROUTE[i - 1][0], ROUTE[i][1] - ROUTE[i - 1][1]));
}
const total = cum[cum.length - 1];

console.log('total arc length:', total.toFixed(1), 'px');
console.log('');
console.log('  idx   point            segLen   frac');
for (let i = 0; i < ROUTE.length; i++) {
  const seg = i === 0 ? 0 : cum[i] - cum[i - 1];
  console.log(
    '  ' + String(i).padStart(3) +
    '   (' + String(ROUTE[i][0]).padStart(4) + ',' + String(ROUTE[i][1]).padStart(4) + ')' +
    '   ' + String(Math.round(seg)).padStart(4) +
    '   ' + (cum[i] / total).toFixed(4)
  );
}
console.log('');
const marks = { 'rampA end (10)': 10, 'flap (12)': 12, 'paddle in (18)': 18, 'paddle out (20)': 20, 'cup (29)': 29 };
for (const [k, i] of Object.entries(marks)) console.log('  ' + k.padEnd(22), (cum[i] / total).toFixed(4));
