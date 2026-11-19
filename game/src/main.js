// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between title, play, paused, caught and
// knocked-out screens; progress saves itself to localStorage.
//
// ?seed=N fixes the city and the traffic. ?shot=start|drive|chase|mission (with
// &seed=N) stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { STEP, VIEW } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_ENTER, ACTION_MUTE, ACTION_PAUSE, ACTION_PUNCH, ACTION_RELOAD, createInput } from './input.js';
import { createWorld, EVENT_BUSTED, EVENT_CRASH, EVENT_MISSION_DONE, EVENT_MISSION_FAILED, EVENT_WASTED } from './world.js';
import { SCREEN_BUSTED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WASTED, createRenderer } from './render.js';
import { stageShot } from './shots.js';
import { loadSave, readBest, writeBest, writeSave } from './save.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;
/** Seconds between automatic saves. */
const SAVE_EVERY = 5;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
canvas.width = VIEW.width;
canvas.height = VIEW.height;
const status = document.getElementById('status');
const audio = createAudio();
const world = createWorld(createRandom(seed), audio);
const renderer = createRenderer(canvas);
const input = createInput(canvas);

let best = readBest();
let muted = false;
let screen = SCREEN_TITLE;
/** The mission Enter starts next, or -1 when none is waiting. */
let pendingMission = -1;
let saveTimer = SAVE_EVERY;
let last = performance.now();
let accumulator = 0;

function announce(message) {
  status.textContent = message;
}

function saveProgress() {
  writeSave(world.serialize());
  if (world.money > best) {
    best = world.money;
    writeBest(best);
  }
}

function startGame() {
  const save = loadSave();
  if (save) {
    world.deserialize(save);
    announce('Welcome back to Qamar City.');
  } else {
    world.reset();
    announce('Welcome to Qamar City.');
  }
  // Missions run in order; the next one is the count of finished missions.
  pendingMission = world.state.storyDone ? -1 : world.state.missionsCompleted;
  screen = SCREEN_PLAY;
}

function startMission(index) {
  if (index < 0 || index >= 6) return;
  world.startMission(index);
  pendingMission = -1;
  announce(`Mission: ${world.missions.current.name}.`);
}

function endRun(nextScreen, message) {
  screen = nextScreen;
  announce(message);
  saveProgress();
  audio.busted();
  world.respawn();
}

/** The mouse aim, in world coordinates. */
function aimAngle() {
  const rect = canvas.getBoundingClientRect();
  const mouse = input.mouse();
  const scaleX = VIEW.width / rect.width;
  const scaleY = VIEW.height / rect.height;
  const wx = mouse.x * scaleX + (world.camera.x - VIEW.width / 2);
  const wy = mouse.y * scaleY + (world.camera.y - VIEW.height / 2);
  return Math.atan2(wy - world.player.y, wx - world.player.x);
}

function frame(now) {
  requestAnimationFrame(frame);
  const frameDt = Math.min((now - last) / 1000, MAX_FRAME);
  accumulator += frameDt;
  last = now;

  // Take the one-shot presses once: every screen reads the same flags.
  const flags = input.takeActions();
  if (flags & ACTION_MUTE) {
    muted = audio.toggleMute();
    audio.unlock();
  }

  if (screen === SCREEN_TITLE) {
    if (flags & ACTION_CONFIRM) startGame();
  } else if (screen === SCREEN_BUSTED || screen === SCREEN_WASTED) {
    if (flags & ACTION_CONFIRM) {
      screen = SCREEN_PLAY;
      announce('Back on the streets of Qamar City.');
    }
  } else if (screen === SCREEN_PAUSED) {
    if (flags & (ACTION_PAUSE | ACTION_CONFIRM)) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  } else if (screen === SCREEN_PLAY) {
    if (flags & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (world.missions.dialogue) {
      if (flags & ACTION_CONFIRM) world.missions.advanceDialogue();
    } else if (pendingMission >= 0 && !world.missions.active && (flags & ACTION_CONFIRM)) {
      startMission(pendingMission);
    }
  }

  if (screen === SCREEN_PLAY) {
    const actions = {
      enter: !!(flags & ACTION_ENTER),
      shootHeld: input.mouseDown,
      punch: !!(flags & ACTION_PUNCH),
      reload: !!(flags & ACTION_RELOAD),
    };
    const aim = aimAngle();
    while (accumulator >= STEP && screen === SCREEN_PLAY) {
      const events = world.step(STEP, input, aim, actions);
      if (events & EVENT_BUSTED) {
        if (world.missions.active) {
          pendingMission = world.missions.missionIndex;
          world.missions.reset();
        }
        world.state.bustedCount += 1;
        endRun(SCREEN_BUSTED, 'Caught by the police.');
      } else if (events & EVENT_WASTED) {
        if (world.missions.active) {
          pendingMission = world.missions.missionIndex;
          world.missions.reset();
        }
        world.state.wastedCount += 1;
        endRun(SCREEN_WASTED, 'Knocked out.');
      } else if (events & EVENT_MISSION_DONE) {
        pendingMission = world.state.storyDone ? -1 : world.missions.nextMissionIndex();
      } else if (events & EVENT_MISSION_FAILED) {
        pendingMission = world.missions.missionIndex;
        world.missions.reset();
        world.state.banner = 'Mission failed — press Enter to retry.';
        world.state.bannerTimer = 5;
      }
      if (events & EVENT_CRASH) audio.crash();
      accumulator -= STEP;
    }
    saveTimer -= frameDt;
    if (saveTimer <= 0) {
      saveTimer = SAVE_EVERY;
      saveProgress();
    }
  } else if (screen === SCREEN_TITLE) {
    while (accumulator >= STEP) {
      // The city stays alive behind the title.
      world.step(STEP, { axis: () => ({ x: 0, y: 0 }), get running() { return false; } }, 0, { enter: false, shootHeld: false, punch: false, reload: false });
      accumulator -= STEP;
    }
  } else {
    accumulator = 0;
  }

  renderer.draw(world, screen, { best, muted }, now / 1000);
}

// Leaving the tab pauses a running game rather than letting the city run unseen.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
    saveProgress();
  }
});
window.addEventListener('beforeunload', saveProgress);

// Exposed for debugging and for the screenshot scenes.
window.__game = world;

if (shot) {
  const scene = stageShot(shot, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, { best: scene.best, muted: false }, performance.now() / 1000);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
} else {
  announce('Arab Town. Press Enter or click to start.');
  requestAnimationFrame(frame);
}
