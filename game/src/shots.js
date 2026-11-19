// The screenshot scenes behind ?shot=start|drive|chase|mission. Each one plays the
// real rules forward from a fresh world for a fixed number of seconds, steered by a
// simple autopilot (follow the road, chase the nearest rival, keep the pedal down),
// so the frame is what a short game really looks like and the same seed always
// gives the same frame. The screenshots are real renders of the game's own code.

import { STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const SAMPLE = STEP;

/** A fake input that reports the axis the autopilot wants this step. */
function fakeInput(axis) {
  return {
    axis: () => axis,
    get running() { return false; },
  };
}

function noActions() {
  return { enter: false, shootHeld: false, punch: false, reload: false };
}

/**
 * Drive a car through waypoints: aim at the current one, take the next when close.
 * Waypoints keep the car on the roads instead of cutting across blocks.
 */
function driveWaypoints(world, waypoints, seconds) {
  let wp = 0;
  for (let i = 0; i < seconds / SAMPLE; i += 1) {
    const car = world.player.inCar;
    if (!car) break;
    while (wp < waypoints.length - 1 && Math.hypot(waypoints[wp].x - car.x, waypoints[wp].y - car.y) < 70) wp += 1;
    const target = waypoints[Math.min(wp, waypoints.length - 1)];
    const desired = Math.atan2(target.y - car.y, target.x - car.x);
    let error = desired - car.heading;
    while (error > Math.PI) error -= Math.PI * 2;
    while (error < -Math.PI) error += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, error * 2.5));
    world.step(SAMPLE, fakeInput({ x: steer, y: -1 }), 0, noActions());
  }
}

export function stageShot(name, world) {
  world.reset();
  if (name !== 'drive' && name !== 'chase' && name !== 'mission') {
    // Title: the city alive for five seconds, camera over the Souq.
    world.camera.x = 900;
    world.camera.y = 700;
    for (let i = 0; i < 5 / SAMPLE; i += 1) {
      world.step(SAMPLE, fakeInput({ x: 0, y: 0 }), 0, noActions());
    }
    world.camera.x = 900;
    world.camera.y = 700;
    return { screen: SCREEN_TITLE, best: 0 };
  }

  if (name === 'drive') {
    // The player takes the garage taxi down Souq Street, through traffic.
    const taxi = world.vehicles.find((v) => v.kind === 'taxi');
    world.player.x = taxi.x;
    world.player.y = taxi.y;
    world.player.inCar = taxi;
    world.vehicles.splice(world.vehicles.indexOf(taxi), 1);
    taxi.heading = Math.PI / 2;
    world.player.heading = Math.PI / 2;
    driveWaypoints(world, [{ x: 640, y: 880 }, { x: 2100, y: 880 }], 6);
    return { screen: SCREEN_PLAY, best: 0 };
  }

  if (name === 'chase') {
    // Three stars: the player flees west down Palm Avenue in a sports car, police behind.
    world.vehicles.push({ x: 2000, y: 880, heading: Math.PI, speed: 0, color: '#f5f5f5', model: 'Sports', kind: 'getaway', health: 100 });
    const car = world.vehicles[world.vehicles.length - 1];
    world.player.x = car.x;
    world.player.y = car.y;
    world.player.inCar = car;
    world.vehicles.splice(world.vehicles.indexOf(car), 1);
    world.player.heading = Math.PI;
    world.police.addWanted(3);
    driveWaypoints(world, [{ x: 1200, y: 880 }, { x: 500, y: 880 }], 3.5);
    return { screen: SCREEN_PLAY, best: 0 };
  }

  // Mission: the dockside shootout — the player holds ground at the Port,
  // pistol in hand, trading shots with the rivals.
  world.startMission(4);
  world.player.x = 330;
  world.player.y = 1420;
  world.player.heading = -Math.PI / 2;
  for (let i = 0; i < 1.2 / SAMPLE; i += 1) {
    let aim = world.player.heading;
    let nearest = null;
    let nearestD = Infinity;
    for (const e of world.enemies) {
      if (e.health <= 0) continue;
      const d = Math.hypot(e.x - world.player.x, e.y - world.player.y);
      if (d < nearestD) { nearestD = d; nearest = e; }
    }
    // Aim at the nearest rival, with a shooter's spread, so the fight is still on.
    if (nearest) aim = Math.atan2(nearest.y - world.player.y, nearest.x - world.player.x) + (Math.sin(i * 2.3) * 0.16);
    world.step(SAMPLE, fakeInput({ x: 0, y: 0 }), aim, { enter: false, shootHeld: true, punch: false, reload: false });
  }
  return { screen: SCREEN_PLAY, best: 0 };
}
