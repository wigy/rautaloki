// Body weight interval training, from the "Fitness" system of the old time2xercise timer
// (its data/fitness.js): five days of exercises, each day run as three rounds of work and
// rest intervals of one minute together (30:30 up to 60:00), with a minute between rounds.

export interface BwExercise {
  id: string
  name: string
  /** No repeats to count: a hold (plank) or running on the spot. */
  hold?: boolean
  steps: string[]
  watch: string[]
}

export interface BwDay {
  id: string
  name: string
  exercises: string[]
}

export const BW_ROUNDS = 3
/** Seconds of one work + rest interval. */
export const BW_INTERVAL = 60
/** Rest between rounds. */
export const BW_ROUND_BREAK = 60
/** Work seconds per interval: 30 (30:30) to 60 (60:00) in steps of 5. */
export const BW_WORK_MIN = 30
export const BW_WORK_MAX = 60
export const BW_WORK_STEP = 5

export const BW_DAYS: BwDay[] = [
  { id: 'bw-day-1', name: 'Day 1', exercises: ['bw-plank', 'bw-lunge', 'bw-push-up', 'bw-star-jump'] },
  {
    id: 'bw-day-2',
    name: 'Day 2',
    exercises: ['bw-left-side-plank', 'bw-right-side-plank', 'bw-squat-jump', 'bw-burpee'],
  },
  {
    id: 'bw-day-3',
    name: 'Day 3',
    exercises: [
      'bw-mountain-climber',
      'bw-left-split-squat',
      'bw-right-split-squat',
      'bw-elevated-push-up',
      'bw-on-the-spot-run',
    ],
  },
  { id: 'bw-day-4', name: 'Day 4', exercises: ['bw-plank-reach', 'bw-squat', 'bw-burpee'] },
  { id: 'bw-day-5', name: 'Day 5', exercises: ['bw-body-rock', 'bw-pike-push-up', 'bw-lunge-jump', 'bw-mountain-run'] },
]

const SIDE_PLANK = {
  steps: [
    'Lie on your side, the elbow under the shoulder, the forearm flat on the floor.',
    'Stack the feet, or put the top foot in front of the lower one for balance.',
    'Lift the hips so the body is a straight line from head to feet.',
    'Hold, breathing steadily.',
  ],
  watch: ['Do not let the hips sag or drift backwards.', 'Push the floor away: do not sink into the shoulder.'],
}

const SPLIT_SQUAT = {
  steps: [
    'Stand in a long stride, the working foot in front, the back heel up.',
    'Lower straight down until the back knee almost touches the floor.',
    'Push up through the front heel to the start. Do all the repeats on this leg.',
  ],
  watch: [
    'The front knee follows the toes; it does not cave inwards.',
    'Keep the torso upright and the weight on the front leg.',
  ],
}

export const BW_EXERCISES: BwExercise[] = [
  {
    id: 'bw-plank',
    name: 'Plank',
    hold: true,
    steps: [
      'Forearms on the floor, elbows under the shoulders, legs straight back on the toes.',
      'Tighten the abs and the glutes so the body is a straight line from head to heels.',
      'Hold, breathing steadily.',
    ],
    watch: ['Do not let the hips sag or pike up.', 'Look at the floor: keep the neck long.'],
  },
  {
    id: 'bw-lunge',
    name: 'Lunge',
    steps: [
      'Stand tall, feet hip width.',
      'Step forward and lower until both knees are bent at about 90 degrees.',
      'Push back off the front foot to standing. Alternate legs.',
    ],
    watch: ['The front knee stays over the foot, not inside it.', 'Keep the torso upright.'],
  },
  {
    id: 'bw-push-up',
    name: 'Push Up',
    steps: [
      'Hands a little wider than the shoulders, body straight from head to heels.',
      'Lower the chest to just above the floor, elbows at about 45 degrees from the body.',
      'Push back up to straight arms.',
    ],
    watch: ['Keep the hips in line: no sagging.', 'Drop to the knees when the full version breaks down.'],
  },
  {
    id: 'bw-star-jump',
    name: 'Star Jump',
    steps: [
      'Stand with the feet together and the arms at your sides.',
      'Jump the feet wide while swinging the arms overhead.',
      'Jump back to the start, and keep a steady rhythm.',
    ],
    watch: ['Land softly on the balls of the feet.'],
  },
  { id: 'bw-left-side-plank', name: 'Left Side Plank', hold: true, ...SIDE_PLANK },
  { id: 'bw-right-side-plank', name: 'Right Side Plank', hold: true, ...SIDE_PLANK },
  {
    id: 'bw-squat-jump',
    name: 'Squat Jump',
    steps: [
      'Stand with the feet shoulder width.',
      'Squat down to about thighs parallel, arms back.',
      'Jump up explosively, swinging the arms up, and land back into the next squat.',
    ],
    watch: ['Land softly with bent knees, the knees tracking over the toes.'],
  },
  {
    id: 'bw-burpee',
    name: 'Burpee',
    steps: [
      'From standing, squat down and put the hands on the floor.',
      'Jump the feet back to a plank and do a push up.',
      'Jump the feet back to the hands and jump up with the arms overhead.',
    ],
    watch: ['Keep the back straight in the plank.', 'Leave out the push up when tired rather than flop.'],
  },
  {
    id: 'bw-mountain-climber',
    name: 'Mountain Climber',
    steps: [
      'Start in a straight-arm plank, the hands under the shoulders.',
      'Drive one knee towards the chest, then switch legs in a steady rhythm.',
    ],
    watch: ['Keep the hips down and the shoulders over the hands.'],
  },
  { id: 'bw-left-split-squat', name: 'Left Split Squat', ...SPLIT_SQUAT },
  { id: 'bw-right-split-squat', name: 'Right Split Squat', ...SPLIT_SQUAT },
  {
    id: 'bw-elevated-push-up',
    name: 'Elevated Push Up',
    steps: [
      'Put the feet on a bench or step, the hands on the floor a little wider than the shoulders.',
      'Lower the chest towards the floor, elbows at about 45 degrees.',
      'Push back up to straight arms.',
    ],
    watch: ['Keep the body straight: the hips do not sag or pike.'],
  },
  {
    id: 'bw-on-the-spot-run',
    name: 'On The Spot Run',
    hold: true,
    steps: ['Run on the spot, lifting the knees and pumping the arms.', 'Keep a pace you can hold for the interval.'],
    watch: ['Stay on the balls of the feet.'],
  },
  {
    id: 'bw-plank-reach',
    name: 'Plank Reach',
    steps: [
      'Start in a straight-arm plank, the feet a little apart.',
      'Reach one arm straight forward, put it back, then reach with the other.',
    ],
    watch: ['Keep the hips square to the floor: do not rotate.'],
  },
  {
    id: 'bw-squat',
    name: 'Squat',
    steps: [
      'Stand with the feet shoulder width, toes slightly out.',
      'Sit the hips back and down until the thighs are at least parallel.',
      'Stand up by pushing through the whole foot.',
    ],
    watch: ['The knees follow the toes.', 'Keep the chest up and the heels down.'],
  },
  {
    id: 'bw-body-rock',
    name: 'Body Rock',
    steps: [
      'Start in a forearm plank.',
      'Rock the body forward over the elbows, then back towards the heels, moving at the ankles.',
    ],
    watch: ['Keep the body straight as a board throughout.'],
  },
  {
    id: 'bw-pike-push-up',
    name: 'Pike Push Up',
    steps: [
      'Start in a push up position, then walk the feet in and lift the hips high, an upside-down V.',
      'Bend the elbows to lower the head towards the floor between the hands.',
      'Press back up to straight arms.',
    ],
    watch: ['Keep the hips high: this works the shoulders, not the chest.'],
  },
  {
    id: 'bw-lunge-jump',
    name: 'Lunge Jump',
    steps: [
      'Start in a lunge, one foot forward, both knees bent.',
      'Jump up and switch legs in the air, landing in a lunge with the other foot in front.',
    ],
    watch: ['Land softly and keep the front knee over the foot.', 'Use plain lunges if the landing gets heavy.'],
  },
  {
    id: 'bw-mountain-run',
    name: 'Mountain Run',
    steps: ['A fast mountain climber: from a straight-arm plank, run the knees in towards the chest as quickly as you can.'],
    watch: ['Keep the hips low and the hands under the shoulders.'],
  },
]

export const BW_GENERAL = [
  'Work at a pace you can keep for all three rounds.',
  'Count the repeats of each exercise over the three rounds, if you want them logged.',
  'Move up a level (more work, less rest) when the whole day feels easy.',
]

const exMap = new Map(BW_EXERCISES.map((e) => [e.id, e]))
const dayMap = new Map(BW_DAYS.map((d) => [d.id, d]))

export function bwExercise(id: string): BwExercise {
  return exMap.get(id) ?? { id, name: id, steps: [], watch: [] }
}

export function bwDay(id: string): BwDay | undefined {
  return dayMap.get(id)
}

/** "40:20" for 40 s work in a one minute interval. */
export function bwLevel(work: number): string {
  return `${work}:${String(BW_INTERVAL - work).padStart(2, '0')}`
}
