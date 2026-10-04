import assert from "node:assert/strict";
import {
  computeLiveRidePrice,
  isNightTariff,
} from "../src/lib/liveRidePricing.ts";
import { isAibdPlace } from "../src/lib/serviceRouting.ts";

const daytime = new Date(2026, 0, 1, 14, 0, 0);
const night = new Date(2026, 0, 1, 23, 0, 0);

assert.equal(isNightTariff(daytime), false);
assert.equal(isNightTariff(night), true);

assert.equal(
  computeLiveRidePrice({
    distanceKm: 0.6,
    durationMinutes: 3,
    rideClass: "comfort",
    startsAt: daytime,
  }).amountFcfa,
  1_000,
  "Aucune course Comfort ne doit être facturée sous 1 000 FCFA",
);

assert.equal(
  computeLiveRidePrice({
    distanceKm: 0.6,
    durationMinutes: 3,
    rideClass: "comfort",
    startsAt: night,
  }).amountFcfa,
  2_000,
  "Une petite course de nuit doit recevoir au moins 1 000 FCFA de supplément",
);

const city = computeLiveRidePrice({
  distanceKm: 10,
  durationMinutes: 25,
  baselineDurationMinutes: 15,
  rideClass: "comfort",
  startsAt: daytime,
});
assert.equal(city.amountFcfa, 2_800);
assert.equal(city.trafficFeeFcfa, 300);

assert.equal(
  computeLiveRidePrice({
    distanceKm: 10,
    durationMinutes: 25,
    rideClass: "comfort_plus",
    startsAt: daytime,
  }).amountFcfa,
  3_900,
);

assert.equal(
  computeLiveRidePrice({
    distanceKm: 10,
    durationMinutes: 25,
    rideClass: "comfort",
    startsAt: daytime,
    demandMultiplier: 1.2,
  }).amountFcfa,
  3_400,
);

assert.equal(
  computeLiveRidePrice({
    distanceKm: 51,
    durationMinutes: 55,
    rideClass: "comfort",
    rideKind: "airport",
    startsAt: night,
  }).amountFcfa,
  36_800,
);

assert.equal(isAibdPlace({ address: "Aéroport international Blaise Diagne (AIBD)" }), true);
assert.equal(isAibdPlace({ address: "Plateau, Dakar", lat: 14.67, lng: -17.43 }), false);
assert.equal(isAibdPlace({ address: "Diass", lat: 14.6708, lng: -17.0726 }), true);

console.log("Live ride pricing self-test: OK");
