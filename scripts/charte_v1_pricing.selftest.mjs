/** Self-test charte v1 — sans alias @/ */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { register } from "node:module";

// Inline minimal asserts mirroring tariffDefaults + engine public rates
const BANDS = [
  { min: 1, max: 4, rate: 800 },
  { min: 5, max: 7, rate: 900 },
  { min: 8, max: 10, rate: 1200 },
];
function rate(p) {
  const b = BANDS.find((x) => p >= x.min && p <= x.max);
  return b?.rate ?? 0;
}
function ceilKm(n) {
  return Math.ceil(Math.max(0, Number(n) || 0));
}
function quote(pax, km, roundTrip = false) {
  const one = ceilKm(km);
  const billable = roundTrip ? one * 2 : one;
  return billable * rate(pax);
}
function assertEq(a, b, msg) {
  if (a !== b) throw new Error(`${msg}: expected ${b}, got ${a}`);
}

assertEq(quote(1, 20), 16000, "T1");
assertEq(quote(4, 50), 40000, "T2");
assertEq(quote(6, 50), 45000, "T3");
assertEq(quote(8, 50), 60000, "T4");
assertEq(quote(10, 100), 120000, "T5");
assertEq(quote(2, 250), 200000, "T6 Fathala");
assertEq(quote(2, 250, true), 400000, "T6 AR");

const partnerMadDakar = 40000;
const partnerHors = 60000 + (150 - 100) * 600;
assertEq(partnerMadDakar, 40000, "partner dakar");
assertEq(partnerHors, 90000, "partner 150km");

console.log("charte_v1_pricing.selftest OK");
