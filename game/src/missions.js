// The story of Arab Town: six missions from Uncle Rashid, Layla and the
// streets of Qamar City. Each mission is a list of steps the engine walks
// through — go somewhere, pick something up, drive a taxi shift, chase a
// debtor's car, survive a dockside shootout, steal a sports car and outrun
// the police to the safehouse. The engine owns the mission state; the world
// owns the cars, rivals and crimes it calls for.

export const MISSIONS = [
  {
    id: 'm1',
    name: 'Welcome Home',
    giver: 'Rashid',
    reward: 150,
    intro: [
      { who: 'Rashid', text: 'Karim! You are back in Qamar City at last. My garage, my nephew — welcome home.' },
      { who: 'Rashid', text: 'My old taxi is parked by the garage. Take it to the Souq and fetch my spice order. Drive careful — the streets are busy.' },
    ],
    steps: [
      { kind: 'goto', x: 520, y: 700, radius: 60, text: 'Go to Rashid\u2019s garage' },
      { kind: 'enterCar', x: 640, y: 700, radius: 70, text: 'Get in the taxi (press E)' },
      { kind: 'goto', x: 480, y: 880, radius: 70, text: 'Drive the taxi to the Souq market', needCar: true },
    ],
    outro: [
      { who: 'Rashid', text: 'Good driving. The city is yours again, Karim — and the work is waiting.' },
    ],
  },
  {
    id: 'm2',
    name: 'The Package',
    giver: 'Rashid',
    reward: 300,
    intro: [
      { who: 'Rashid', text: 'A friend at the Port has a package for me. No questions, no opening it. Bring it to the house in Palm Heights.' },
      { who: 'Rashid', text: 'Fast, Karim. Layla\u2019s friends do not like to wait.' },
    ],
    steps: [
      { kind: 'pickup', x: 300, y: 1400, radius: 60, text: 'Pick up the package at the Port' },
      { kind: 'goto', x: 2100, y: 400, radius: 80, text: 'Deliver the package to Palm Heights', timeLimit: 100 },
    ],
    outro: [
      { who: 'Layla', text: 'Delivered in one piece. You drive like the desert wind, Karim.' },
    ],
  },
  {
    id: 'm3',
    name: 'Night Shift',
    giver: 'Layla',
    reward: 350,
    intro: [
      { who: 'Layla', text: 'My taxi driver called in sick. Three fares are waiting around town — take them where they need to go.' },
      { who: 'Layla', text: 'Pick up each fare, then follow the marker to their stop. Tips if you are quick.' },
    ],
    steps: [
      { kind: 'taxi', x: 700, y: 300, dx: 1500, dy: 1000, text: 'Pick up fare 1, then drop them off' },
      { kind: 'taxi', x: 1800, y: 1400, dx: 900, dy: 300, text: 'Pick up fare 2, then drop them off' },
      { kind: 'taxi', x: 1100, y: 1600, dx: 2100, dy: 1300, text: 'Pick up fare 3, then drop them off' },
    ],
    outro: [
      { who: 'Layla', text: 'Three fares, no complaints. The taxi is yours whenever you want the work.' },
    ],
  },
  {
    id: 'm4',
    name: 'The Debt',
    giver: 'Rashid',
    reward: 450,
    intro: [
      { who: 'Rashid', text: 'Omar owes me for three months of garage work. He is driving around the city in his red coupe, thinking I forgot.' },
      { who: 'Rashid', text: 'Catch him. Bump his car until it stops, then take what he owes. Try not to scratch my taxi.' },
    ],
    steps: [
      { kind: 'chase', x: 1280, y: 880, hits: 3, text: 'Chase Omar\u2019s coupe and ram it 3 times' },
      { kind: 'collect', x: 0, y: 0, radius: 70, text: 'Collect the debt from Omar' },
    ],
    outro: [
      { who: 'Omar', text: 'Fine! Take it! Tell Rashid I will pay on time from now on!' },
    ],
  },
  {
    id: 'm5',
    name: 'Dockside Trouble',
    giver: 'Layla',
    reward: 600,
    intro: [
      { who: 'Layla', text: 'The Sand Vipers are at the Port, leaning on my cousin\u2019s warehouse. They brought guns.' },
      { who: 'Layla', text: 'Take my pistol and the spare rounds. Send them home — and come back in one piece.' },
    ],
    steps: [
      { kind: 'goto', x: 300, y: 1400, radius: 90, text: 'Go to the Port warehouses' },
      { kind: 'shootout', x: 300, y: 1400, count: 5, text: 'Drive off the Sand Vipers (5 left)' },
    ],
    outro: [
      { who: 'Layla', text: 'The Port is quiet again. You fight like a lion, Karim.' },
    ],
  },
  {
    id: 'm6',
    name: 'The Getaway',
    giver: 'Rashid',
    reward: 800,
    intro: [
      { who: 'Rashid', text: 'One last job, then we are even with everyone. A white sports car is parked at the Marina — the owner will not miss it tonight.' },
      { who: 'Rashid', text: 'Take it, and lose the police. Get to the safehouse in Palm Heights and the car is yours to keep.' },
    ],
    steps: [
      { kind: 'steal', x: 350, y: 240, radius: 70, text: 'Steal the white sports car at the Marina' },
      { kind: 'escape', x: 2140, y: 420, radius: 90, minWanted: 2, text: 'Escape to the safehouse — stay ahead of the police' },
    ],
    outro: [
      { who: 'Rashid', text: 'Qamar City is yours now, Karim. Drive it like you own it — because tonight, you do.' },
    ],
  },
];

export function createMissions() {
  let missionIndex = -1;
  let stepIndex = 0;
  let stepTimer = 0;
  let dialogue = [];
  let dialogueIndex = 0;
  let dialogueTimer = 0;
  let taxiPhase = 'pickup';
  let chaseHits = 0;
  let chaseTargetFn = null;
  let collectAt = null;
  let hideTimer = 0;
  let active = false;
  let finished = false;

  function mission() {
    return missionIndex >= 0 && missionIndex < MISSIONS.length ? MISSIONS[missionIndex] : null;
  }

  function currentStep() {
    const m = mission();
    return m ? m.steps[stepIndex] : null;
  }

  /** Play the mission's intro lines and set up what it needs. */
  function start(index, ctx) {
    missionIndex = index;
    stepIndex = 0;
    stepTimer = 0;
    chaseHits = 0;
    collectAt = null;
    taxiPhase = 'pickup';
    hideTimer = 0;
    active = true;
    finished = false;
    const m = mission();
    dialogue = [...m.intro];
    dialogueIndex = 0;
    dialogueTimer = 0;
    if (m.id === 'm5') ctx.givePistol();
    if (m.id === 'm3') ctx.spawnMissionTaxi();
    if (m.id === 'm4') ctx.spawnChaseCar(m.steps[0].x, m.steps[0].y);
    if (m.id === 'm6') ctx.spawnGetawayCar(m.steps[0].x, m.steps[0].y);
  }

  function advanceDialogue() {
    if (dialogueIndex < dialogue.length - 1) {
      dialogueIndex += 1;
      dialogueTimer = 0;
    } else {
      dialogue = [];
      dialogueIndex = 0;
    }
  }

  /** Finish the current step; on the last step, pay out and close the mission. */
  function completeStep(ctx) {
    const m = mission();
    stepIndex += 1;
    stepTimer = 0;
    if (stepIndex >= m.steps.length) {
      ctx.addMoney(m.reward);
      dialogue = [...m.outro];
      dialogueIndex = 0;
      dialogueTimer = 0;
      active = false;
      finished = true;
      return 'completed';
    }
    return 'step';
  }

  /** Where the objective marker points, or null when nothing is active. */
  function target() {
    const s = currentStep();
    if (!s || !active) return null;
    if (s.kind === 'chase') return chaseTargetFn ? chaseTargetFn() : null;
    if (s.kind === 'collect') return collectAt ? { x: collectAt.x, y: collectAt.y, radius: s.radius } : null;
    if (s.kind === 'taxi') {
      if (taxiPhase === 'pickup') return { x: s.x, y: s.y, radius: 70 };
      return { x: s.dx, y: s.dy, radius: 80 };
    }
    if (s.kind === 'shootout') return { x: s.x, y: s.y, radius: s.radius || 90 };
    if (s.kind === 'enterCar' || s.kind === 'steal') return { x: s.x, y: s.y, radius: s.radius };
    return { x: s.x, y: s.y, radius: s.radius || 70 };
  }

  /** One step's completion test, by kind. Returns 'completed', 'step' or null. */
  function checkStep(s, ctx, dt) {
    const px = ctx.player.x;
    const py = ctx.player.y;
    const dist = (x, y) => Math.hypot(px - x, py - y);

    switch (s.kind) {
      case 'goto':
      case 'pickup': {
        if (s.needCar && !ctx.player.inCar) return null;
        if (dist(s.x, s.y) < s.radius) {
          if (s.kind === 'pickup') ctx.playPickup();
          return completeStep(ctx);
        }
        return null;
      }
      case 'enterCar': {
        if (ctx.player.inCar && dist(s.x, s.y) < 220) return completeStep(ctx);
        return null;
      }
      case 'taxi': {
        if (!ctx.player.inCar) return null;
        if (taxiPhase === 'pickup') {
          if (dist(s.x, s.y) < 70) {
            taxiPhase = 'dropoff';
            ctx.playPickup();
            ctx.addMoney(15);
          }
        } else if (dist(s.dx, s.dy) < 80) {
          taxiPhase = 'pickup';
          ctx.addMoney(20);
          return completeStep(ctx);
        }
        return null;
      }
      case 'chase': {
        if (ctx.chaseHits() >= s.hits) {
          collectAt = ctx.chaseCarPos();
          return completeStep(ctx);
        }
        return null;
      }
      case 'collect': {
        if (collectAt && dist(collectAt.x, collectAt.y) < s.radius) return completeStep(ctx);
        return null;
      }
      case 'shootout': {
        if (ctx.rivalsLeft() === 0) return completeStep(ctx);
        return null;
      }
      case 'steal': {
        if (ctx.player.inCar && ctx.playerCarIs('getaway')) return completeStep(ctx);
        return null;
      }
      case 'escape': {
        if (dist(s.x, s.y) < s.radius) {
          // Hiding at the safehouse shakes the police: stay put for 5 seconds.
          hideTimer += dt;
          if (hideTimer >= 5) {
            ctx.clearWanted();
            return completeStep(ctx);
          }
        } else {
          hideTimer = 0;
        }
        return null;
      }
      default:
        return null;
    }
  }

  function stepUpdate(dt, ctx) {
    if (dialogue.length > 0) {
      dialogueTimer += dt;
      if (dialogueTimer > 5) advanceDialogue();
    }
    if (!active) return null;
    const s = currentStep();
    if (!s) return null;
    stepTimer += dt;
    if (s.timeLimit && stepTimer > s.timeLimit) return 'failed';
    return checkStep(s, ctx, dt);
  }

  return {
    get missionIndex() { return missionIndex; },
    get active() { return active; },
    get finished() { return finished; },
    get dialogue() { return dialogue.length > 0 ? dialogue[dialogueIndex] : null; },
    get current() { return mission(); },
    get step() { return currentStep(); },
    get stepTimer() { return stepTimer; },
    get taxiPhase() { return taxiPhase; },
    get chaseHits() { return chaseHits; },
    mission, start, target, stepUpdate, advanceDialogue,
    setChaseTarget(fn) { chaseTargetFn = fn; },
    nextMissionIndex() {
      return missionIndex + 1 < MISSIONS.length ? missionIndex + 1 : -1;
    },
    reset() {
      missionIndex = -1;
      stepIndex = 0;
      active = false;
      finished = false;
      dialogue = [];
    },
  };
}
