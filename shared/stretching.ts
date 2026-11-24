// Guided stretching routines. They follow the usual evidence-based advice:
// - Before lifting, warm up with dynamic stretches (controlled movement through the range,
//   7-10 minutes): long static holds right before lifting lower strength and power a little.
// - Static stretching builds flexibility when done after training or in its own session,
//   at least 2-3 days a week (daily is best): hold to mild tension, not pain, 10-30 s per
//   hold (30-60 s for older lifters), about 60 s in all per muscle group, so 2 holds of 30 s.
// Sources are listed in README.md.

export interface Stretch {
  id: string
  name: string
  /** Done for the left and the right side in turn. */
  sides?: boolean
  /** What it stretches, shown under the name. */
  target: string
  steps: string[]
  watch: string[]
}

export interface Routine {
  id: string
  name: string
  /** Dynamic: moved for a fixed time. Static: held for the chosen seconds. */
  kind: 'dynamic' | 'static'
  about: string
  stretches: string[]
}

/** Seconds per dynamic move; a move done per side gets DYNAMIC_SIDE per side. */
export const DYNAMIC_MOVE = 30
export const DYNAMIC_SIDE = 20
/** Holds per side of a static stretch. */
export const STATIC_HOLDS = 2
export const HOLD_MIN = 15
export const HOLD_MAX = 60
export const HOLD_STEP = 5
export const HOLD_DEFAULT = 30
/** Pause to get into the next stretch, and to switch sides. */
export const STRETCH_CHANGE = 10
export const SIDE_CHANGE = 5

export const ROUTINES: Routine[] = [
  {
    id: 'warm-up',
    name: 'Warm-up',
    kind: 'dynamic',
    about: 'Dynamic moves before lifting. Move under control, a little bigger each repeat.',
    stretches: [
      'arm-circles',
      'torso-twist',
      'hip-circles',
      'leg-swing-front',
      'leg-swing-side',
      'cat-cow',
      'inchworm',
      'air-squat',
      'reverse-lunge-reach',
      'glute-bridge',
    ],
  },
  {
    id: 'full-body',
    name: 'Full body',
    kind: 'static',
    about: 'Static holds after training or on a rest day, 2 holds per side. Hold at mild tension, never pain.',
    stretches: [
      'calf',
      'standing-quad',
      'hamstring',
      'hip-flexor',
      'figure-four',
      'butterfly',
      'childs-pose',
      'doorway-chest',
      'cross-body-shoulder',
      'overhead-triceps',
    ],
  },
  {
    id: 'hips-back',
    name: 'Hips and back',
    kind: 'static',
    about: 'Static holds for the hips and the lower back, good after squats and deadlifts or a day of sitting.',
    stretches: ['hip-flexor', 'figure-four', 'hamstring', 'supine-twist', 'knees-to-chest', 'childs-pose'],
  },
]

export const STRETCHES: Stretch[] = [
  // Dynamic
  {
    id: 'arm-circles',
    name: 'Arm circles',
    target: 'Shoulders',
    steps: [
      'Stand tall with the arms out to the sides.',
      'Circle the arms forward, small at first and then bigger. Halfway, circle backwards.',
    ],
    watch: ['Keep the ribs down: do not arch the lower back.'],
  },
  {
    id: 'torso-twist',
    name: 'Torso twists',
    target: 'Upper back, obliques',
    steps: [
      'Stand with the feet hip width, the arms bent in front of the chest.',
      'Turn the upper body left and right in a smooth rhythm, letting the heels pivot.',
    ],
    watch: ['Turn, do not swing hard into the end of the range.'],
  },
  {
    id: 'hip-circles',
    name: 'Hip circles',
    target: 'Hips',
    steps: [
      'Hands on the hips, feet shoulder width.',
      'Draw big circles with the hips. Halfway, change direction.',
    ],
    watch: ['Keep the shoulders roughly over the feet.'],
  },
  {
    id: 'leg-swing-front',
    name: 'Leg swings, front to back',
    sides: true,
    target: 'Hamstrings, hip flexors',
    steps: [
      'Hold on to a wall or rack with one hand and stand on one leg.',
      'Swing the free leg forward and back, letting the range grow each swing.',
    ],
    watch: ['Keep the torso upright and the standing knee soft.'],
  },
  {
    id: 'leg-swing-side',
    name: 'Leg swings, side to side',
    sides: true,
    target: 'Adductors, glutes',
    steps: ['Face the wall with both hands on it and stand on one leg.', 'Swing the free leg across the body and out to the side.'],
    watch: ['Keep the hips facing the wall.'],
  },
  {
    id: 'cat-cow',
    name: 'Cat-cow',
    target: 'Spine',
    steps: [
      'On hands and knees, the hands under the shoulders and the knees under the hips.',
      'Round the back up towards the ceiling, then let it sink while lifting the chest. Breathe with the move.',
    ],
    watch: ['Move slowly through the whole spine.'],
  },
  {
    id: 'inchworm',
    name: 'Inchworm',
    target: 'Hamstrings, shoulders',
    steps: [
      'From standing, fold forward and put the hands on the floor, bending the knees as needed.',
      'Walk the hands out to a plank, then walk the feet up to the hands and stand up.',
    ],
    watch: ['Keep the hips from sagging in the plank.'],
  },
  {
    id: 'air-squat',
    name: 'Air squats',
    target: 'Legs, hips',
    steps: ['Feet shoulder width, squat down as deep as you can with good form and stand up.', 'Reach the arms forward as you go down.'],
    watch: ['Heels down, the knees following the toes.'],
  },
  {
    id: 'reverse-lunge-reach',
    name: 'Reverse lunge with reach',
    target: 'Hip flexors, quads',
    steps: [
      'Step back into a lunge and reach both arms overhead.',
      'Step back to standing and change legs.',
    ],
    watch: ['Squeeze the glute of the back leg to open the front of the hip.'],
  },
  {
    id: 'glute-bridge',
    name: 'Glute bridges',
    target: 'Glutes',
    steps: [
      'Lie on the back, the knees bent and the feet flat near the hips.',
      'Lift the hips until the body is straight from knees to shoulders, squeeze, and lower.',
    ],
    watch: ['Push through the heels; do not arch the lower back.'],
  },

  // Static
  {
    id: 'calf',
    name: 'Calf stretch',
    sides: true,
    target: 'Calves',
    steps: [
      'Hands on a wall, one foot back with the leg straight and the heel on the floor.',
      'Bend the front knee and lean towards the wall until the back calf stretches.',
    ],
    watch: ['Point the back toes straight forward.'],
  },
  {
    id: 'standing-quad',
    name: 'Standing quad stretch',
    sides: true,
    target: 'Quads, hip flexors',
    steps: [
      'Stand on one leg, holding on to something if needed.',
      'Bend the other knee and hold the ankle behind you, the knees side by side.',
      'Push the hip slightly forward.',
    ],
    watch: ['Do not arch the lower back or let the knee drift out.'],
  },
  {
    id: 'hamstring',
    name: 'Seated hamstring stretch',
    sides: true,
    target: 'Hamstrings',
    steps: [
      'Sit with one leg straight, the other bent with the sole against the inner thigh.',
      'Hinge forward from the hips over the straight leg until the back of the thigh stretches.',
    ],
    watch: ['Lead with the chest: keep the back long rather than rounding it.'],
  },
  {
    id: 'hip-flexor',
    name: 'Kneeling hip flexor stretch',
    sides: true,
    target: 'Hip flexors',
    steps: [
      'Kneel on one knee, the other foot in front, both knees at about 90 degrees.',
      'Tuck the pelvis under and shift forward until the front of the back hip stretches.',
      'Reach the arm of the kneeling side overhead to add to it.',
    ],
    watch: ['Squeeze the glute of the kneeling side; do not lean into the lower back.'],
  },
  {
    id: 'figure-four',
    name: 'Figure-four stretch',
    sides: true,
    target: 'Glutes, outer hip',
    steps: [
      'Lie on the back, knees bent. Cross one ankle over the other knee.',
      'Lift the lower foot and pull that thigh towards you until the crossed hip stretches.',
    ],
    watch: ['Keep the head and shoulders relaxed on the floor.'],
  },
  {
    id: 'butterfly',
    name: 'Butterfly stretch',
    target: 'Inner thighs',
    steps: [
      'Sit with the soles of the feet together and the knees out to the sides.',
      'Hold the feet, sit tall and let the knees sink. Lean forward a little for more.',
    ],
    watch: ['Do not push the knees down with force.'],
  },
  {
    id: 'childs-pose',
    name: "Child's pose",
    target: 'Lats, lower back',
    steps: [
      'Kneel, the big toes together and the knees apart.',
      'Sit back on the heels and walk the hands forward, the forehead towards the floor.',
    ],
    watch: ['Reach long through the arms and breathe into the back.'],
  },
  {
    id: 'doorway-chest',
    name: 'Doorway chest stretch',
    target: 'Chest, front shoulders',
    steps: [
      'Stand in a doorway, the forearms on the frame, elbows at shoulder height.',
      'Step one foot through until the chest stretches.',
    ],
    watch: ['Keep the shoulders down and away from the ears.'],
  },
  {
    id: 'cross-body-shoulder',
    name: 'Cross-body shoulder stretch',
    sides: true,
    target: 'Rear shoulder, upper back',
    steps: ['Bring one arm straight across the chest.', 'Hold it above the elbow with the other hand and pull it gently closer.'],
    watch: ['Keep the shoulder down; do not twist the torso.'],
  },
  {
    id: 'overhead-triceps',
    name: 'Overhead triceps stretch',
    sides: true,
    target: 'Triceps, lats',
    steps: [
      'Lift one arm overhead and bend the elbow so the hand drops behind the neck.',
      'With the other hand, gently push the elbow back and down.',
    ],
    watch: ['Keep the head up and the ribs down.'],
  },
  {
    id: 'supine-twist',
    name: 'Lying twist',
    sides: true,
    target: 'Lower back, glutes',
    steps: [
      'Lie on the back with the arms out to the sides.',
      'Bring one knee across the body to the floor on the other side and look the other way.',
    ],
    watch: ['Keep both shoulders on the floor.'],
  },
  {
    id: 'knees-to-chest',
    name: 'Knees to chest',
    target: 'Lower back',
    steps: ['Lie on the back and pull both knees towards the chest.', 'Relax the lower back into the floor.'],
    watch: ['Hold behind the thighs if holding the shins strains the knees.'],
  },
]

export const STRETCH_GENERAL = [
  'Stretch to mild tension, never pain, and breathe slowly. Do not bounce.',
  'Static stretching works best warm: after training, or after a few minutes of moving.',
  'Before lifting, use the dynamic warm-up; keep long static holds for after.',
  'Two or three days a week builds flexibility; daily is best.',
]

const stretchMap = new Map(STRETCHES.map((s) => [s.id, s]))
const routineMap = new Map(ROUTINES.map((r) => [r.id, r]))

export function stretch(id: string): Stretch {
  return stretchMap.get(id) ?? { id, name: id, target: '', steps: [], watch: [] }
}

export function routine(id: string): Routine | undefined {
  return routineMap.get(id)
}
