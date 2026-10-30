// Short form instructions per catalog exercise id, shown on the training card.
// Exercises without an entry just get the general points.

export interface HowTo {
  steps: string[]
  watch: string[]
}

export const GENERAL = [
  'Warm up with a light set before the working weight.',
  'Control the weight both ways: lift with intent, lower slowly. No bouncing or swinging.',
  'Breathe out on the effort, in on the way back.',
  'Stop the set if the form breaks down; a rep done badly does not count.',
]

export const HOWTO: Record<string, HowTo> = {
  'db-side-bend': {
    steps: [
      'Stand tall, feet hip width, a dumbbell in one hand, the other hand on your hip.',
      'Bend straight sideways towards the dumbbell, as far as is comfortable.',
      'Come back up with the opposite side of your waist and continue a little past upright.',
      'Do all the reps on one side, then switch.',
    ],
    watch: ['Move only sideways: do not lean forward or twist.', 'Keep the hips still.'],
  },
  'c-seated-crunch': {
    steps: [
      'Sit on the bench facing away from the cable, the rope or handle behind your head.',
      'Crunch forward by rolling the ribs towards the hips.',
      'Squeeze the abs at the bottom, then let the cable pull you slowly back.',
    ],
    watch: [
      'The arms only hold the handle; do not pull with them.',
      'Round the spine with the abs, do not just hinge at the hips.',
    ],
  },
  'seated-twist': {
    steps: [
      'Sit on the edge of the chair, feet flat, the bar across your upper back as for a squat.',
      'Turn the upper body to one side as far as is comfortable, then to the other.',
      'Each turn to both sides is one rep.',
    ],
    watch: [
      'Keep the hips and knees facing forward.',
      'Turn smoothly; do not throw the bar around.',
      'Use a light bar.',
    ],
  },
  'press-sit-up-level': {
    steps: [
      'Lie on the bench, knees bent, feet anchored under the chairs.',
      'Hold the bar at your chest and press it straight up over the chest.',
      'Keeping the arms straight and the bar over you, sit up until the bar is overhead.',
      'Lower back down slowly with the arms still straight.',
    ],
    watch: ['Start very light: this is an expert move.', 'Do not jerk up with the arms; lift with the abs.'],
  },
  'db-curl': {
    steps: [
      'Stand tall, a dumbbell in each hand, arms straight, palms facing forward.',
      'Curl the dumbbells up, keeping the elbows at your sides.',
      'Squeeze at the top, lower slowly until the arms are straight.',
    ],
    watch: ['Elbows stay still; do not swing with the back.', 'Lower all the way down.'],
  },
  curl: {
    steps: [
      'Stand tall, the bar in an underhand grip at shoulder width, arms straight.',
      'Curl the bar up to the shoulders, elbows staying at your sides.',
      'Lower slowly until the arms are straight.',
    ],
    watch: ['No leaning back or swinging the hips.', 'Keep the wrists straight.'],
  },
  'db-hammer-curl': {
    steps: [
      'Stand tall, dumbbells at your sides, palms facing each other.',
      'Curl them up, keeping the palms facing in all the way.',
      'Lower slowly until the arms are straight.',
    ],
    watch: ['Elbows stay at your sides.', 'Do not swing.'],
  },
  'db-concentration-curl': {
    steps: [
      'Sit on the chair, legs apart, lean forward a little.',
      'Hold the dumbbell with the back of the upper arm against the inner thigh.',
      'Curl the dumbbell to the shoulder, then lower slowly to a straight arm.',
      'Do all the reps with one arm, then switch.',
    ],
    watch: ['Only the forearm moves.', 'Keep the upper arm pressed against the thigh.'],
  },
  'seated-calf-raise': {
    steps: [
      'Sit with the balls of your feet on a block or plate, heels free.',
      'Rest the bar across your thighs just above the knees; pad it if needed.',
      'Let the heels drop as low as they go, then raise them as high as you can.',
      'Hold the top for a moment.',
    ],
    watch: ['Full range of movement: deep stretch, full squeeze.', 'No bouncing at the bottom.'],
  },
  'db-calf-raise': {
    steps: [
      'Stand with the balls of your feet on the edge of the log, a dumbbell in each hand.',
      'Let the heels drop below the edge, then rise up onto your toes as high as you can.',
      'Hold the top for a moment, lower slowly.',
    ],
    watch: ['Keep the knees straight but not locked.', 'Stand steady; touch a wall for balance if needed.'],
  },
  'db-1-leg-calf-raise': {
    steps: [
      'Sit with the ball of one foot on a block or plate, the dumbbell resting on that knee.',
      'Lower the heel as far as it goes, then raise it as high as you can.',
      'Do all the reps with one leg, then switch.',
    ],
    watch: ['Full range of movement.', 'Move slowly, no bouncing.'],
  },
  'incline-bench-press': {
    steps: [
      'Set the bench to about 30–45°. Lie with eyes under the bar, feet flat on the floor.',
      'Grip a little wider than shoulders, shoulder blades pulled back and down.',
      'Unrack, lower the bar to the upper chest, elbows about 45° from the body.',
      'Press back up over the shoulders.',
    ],
    watch: [
      'Keep the shoulder blades back the whole set.',
      'Do not bounce the bar off the chest.',
      'Set the rack safeties or have a spotter.',
    ],
  },
  'bench-press': {
    steps: [
      'Lie with eyes under the bar, feet flat, a slight arch in the lower back.',
      'Grip a little wider than shoulders, shoulder blades pulled back and down.',
      'Unrack, lower the bar under control to the lower chest, elbows about 45° from the body.',
      'Press up and slightly back to over the shoulders.',
    ],
    watch: [
      'Buttocks and shoulders stay on the bench.',
      'Wrists straight, the bar over the forearms.',
      'Set the rack safeties or have a spotter.',
    ],
  },
  'db-bench-press': {
    steps: [
      'Sit with the dumbbells on your thighs, lie back and bring them to the chest.',
      'Press them up over the chest, palms facing forward.',
      'Lower slowly until the elbows are a little below the bench, then press up again.',
    ],
    watch: ['Elbows about 45° from the body, not flared out.', 'Keep the shoulder blades back on the bench.'],
  },
  'db-p-u-wrist-curl': {
    steps: [
      'Sit on the chair, forearms on the thighs, wrists just past the knees, palms up.',
      'Let the dumbbells roll down towards the fingers.',
      'Curl the wrists up as high as they go, then lower slowly.',
    ],
    watch: ['Only the wrists move; forearms stay on the thighs.', 'Use a light weight and many slow reps.'],
  },
  'glute-bridge': {
    steps: [
      'Sit on the floor with the bar over the hips; pad it. Lie back, knees bent, feet flat.',
      'Drive through the heels and lift the hips until the body is straight from knees to shoulders.',
      'Squeeze the glutes at the top, lower slowly.',
    ],
    watch: ['Do not over-arch the lower back at the top.', 'Knees point the same way as the toes.'],
  },
  'romanian-deadlift': {
    steps: [
      'Take the bar from the rack at hip height, feet hip width, a slight bend in the knees.',
      'Push the hips back and let the bar slide down along the thighs.',
      'Go down until you feel a strong stretch in the hamstrings, usually just below the knees.',
      'Drive the hips forward to stand up.',
    ],
    watch: [
      'Back flat the whole time.',
      'The bar stays touching the legs.',
      'The knee bend stays the same; this is not a squat.',
    ],
  },
  'sumo-deadlift': {
    steps: [
      'Stand wide, toes turned out, shins close to the bar.',
      'Grip the bar inside the knees, arms straight, chest up.',
      'Push the floor away and the knees out, stand up with the bar close to the body.',
      'Lower by pushing the hips back, then bending the knees.',
    ],
    watch: ['Back flat, do not round it.', 'Knees track over the toes.', 'Hips and shoulders rise together.'],
  },
  'bent-arm-pullover': {
    steps: [
      'Lie on the bench with the head at its end, the bar held over the chest, elbows bent.',
      'Keeping the elbow bend fixed, lower the bar back over your head until you feel a stretch.',
      'Pull it back over the chest along the same arc.',
    ],
    watch: ['Do not lower further than the shoulders allow.', 'Keep the lower back on the bench.'],
  },
  deadlift: {
    steps: [
      'Feet hip width, the bar over the middle of the feet.',
      'Grip just outside the legs, shins to the bar, chest up, back flat.',
      'Brace the core, push the floor away and stand up with the bar close to the legs.',
      'At the top stand tall; do not lean back. Lower by pushing the hips back first.',
    ],
    watch: [
      'Never round the back.',
      'The bar travels in a straight line, touching the legs.',
      'Hips and shoulders rise at the same rate.',
    ],
  },
  'seated-good-mornings': {
    steps: [
      'Sit on the end of the bench, the bar on the upper back on the foam roll, feet apart.',
      'With a flat back, lean forward from the hips as far as is comfortable.',
      'Come back up to upright.',
    ],
    watch: ['Keep the back flat and the chest up.', 'Use a light weight and go slowly.'],
  },
  'bent-over-row': {
    steps: [
      'Hold the bar overhand, knees slightly bent, lean forward to about 45° with a flat back.',
      'Pull the bar to the lower chest or belly, elbows close to the body.',
      'Squeeze the shoulder blades together, lower slowly to straight arms.',
    ],
    watch: ['The upper body stays still; do not jerk with the back.', 'Back flat the whole set.'],
  },
  'db-incline-row': {
    steps: [
      'Lie chest down on the incline bench, a dumbbell in each hand, arms hanging.',
      'Row both dumbbells up, elbows pointing back.',
      'Squeeze the shoulder blades together, lower slowly.',
    ],
    watch: ['Keep the chest on the bench.', 'Do not shrug the shoulders up.'],
  },
  'db-1-arm-row': {
    steps: [
      'Put one knee and the same hand on the bench, the back flat and level.',
      'Hold the dumbbell in the free hand, arm straight.',
      'Row it to the hip, elbow close to the body, then lower slowly.',
      'Do all the reps with one arm, then switch.',
    ],
    watch: ['Do not twist the upper body to lift.', 'Pull with the back, not the biceps.'],
  },
  't-bar-row': {
    steps: [
      'Stand over the bar, knees bent, lean forward with a flat back.',
      'Grip the handles and pull the weight towards the chest.',
      'Squeeze the shoulder blades together, lower slowly.',
    ],
    watch: ['Back flat and still.', 'Do not stand up as you pull.'],
  },
  'back-squat': {
    steps: [
      'Bar on the upper back, not the neck. Feet about shoulder width, toes slightly out.',
      'Brace the core, sit down and back between the heels.',
      'Go down until the thighs are at least parallel to the floor.',
      'Drive up through the whole foot.',
    ],
    watch: [
      'Knees follow the toes, not caving in.',
      'Back flat, chest up, heels on the floor.',
      'Set the rack safeties at a height just below the bottom.',
    ],
  },
  'squat-to-a-bench': {
    steps: [
      'Set the bench behind you so that you touch it at about parallel depth.',
      'Bar on the upper back, feet a little wider than shoulders.',
      'Sit back until you just touch the bench, then stand back up.',
    ],
    watch: ['Touch the bench, do not drop onto it or relax.', 'Knees follow the toes, back flat.'],
  },
  'reverse-lunge': {
    steps: [
      'Bar on the upper back, stand tall with feet together.',
      'Step one foot back and lower until the back knee almost touches the floor.',
      'Push through the front heel to return to standing.',
      'Alternate legs, or do all reps on one side first.',
    ],
    watch: ['Front knee over the foot, not past the toes inwards.', 'Upper body upright.'],
  },
  'db-squat': {
    steps: [
      'Stand with feet shoulder width, dumbbells hanging at your sides.',
      'Sit down and back until the thighs are parallel to the floor.',
      'Stand back up through the whole foot.',
    ],
    watch: ['Knees follow the toes.', 'Back flat, chest up.'],
  },
  'db-lunges': {
    steps: [
      'Stand tall, dumbbells at your sides; use the chairs for balance if needed.',
      'Step forward and lower until both knees are at about 90°.',
      'Push back up through the front heel to the start.',
      'Alternate legs.',
    ],
    watch: ['Front knee stays over the foot.', 'Upper body upright, do not lean forward.'],
  },
  'db-goblet-squat': {
    steps: [
      'Hold the dumbbell vertically at your chest with both hands.',
      'Feet a little wider than shoulders, toes slightly out.',
      'Squat down between the knees, elbows inside the knees, then stand back up.',
    ],
    watch: ['Chest up, the dumbbell close to the body.', 'Heels stay on the floor.'],
  },
  'db-front-raise': {
    steps: [
      'Stand tall, dumbbells in front of the thighs, palms facing you.',
      'Raise one or both arms forward to shoulder height, arms almost straight.',
      'Lower slowly.',
    ],
    watch: ['No swinging with the body.', 'Do not go above shoulder height.', 'Use a light weight.'],
  },
  'shoulder-press': {
    steps: [
      'Sit on the bench with the back supported, the bar in front at shoulder height in the rack.',
      'Grip a little wider than shoulders, unrack and hold at the top of the chest.',
      'Press the bar straight up, moving the head slightly back for it to pass.',
      'Lower back to the top of the chest.',
    ],
    watch: ['Do not arch the lower back off the bench.', 'Wrists straight, elbows under the bar.'],
  },
  'db-shoulder-press': {
    steps: [
      'Sit on the chair, back upright, dumbbells at shoulder height, palms forward.',
      'Press them up until the arms are straight over the shoulders.',
      'Lower slowly back to shoulder height.',
    ],
    watch: ['Keep the core tight, do not lean back.', 'Elbows under the wrists.'],
  },
  'db-reverse-flyes': {
    steps: [
      'Lie chest down on the incline bench, dumbbells hanging, palms facing each other.',
      'With a slight bend in the elbows, raise the arms out to the sides to shoulder height.',
      'Squeeze the shoulder blades together, lower slowly.',
    ],
    watch: ['Use a light weight.', 'Do not shrug the shoulders up towards the ears.'],
  },
  'military-press-standing': {
    steps: [
      'Stand with feet hip width, the bar at the top of the chest, grip just outside shoulders.',
      'Tighten the glutes and core.',
      'Press the bar straight up, moving the head back and then through once the bar passes.',
      'Finish with the bar over the middle of the feet, lower back to the chest.',
    ],
    watch: ['Do not lean back or push with the legs.', 'Lock the core: no arching of the lower back.'],
  },
  'db-upright-row': {
    steps: [
      'Stand tall, dumbbells in front of the thighs, palms facing you.',
      'Lift them along the body to chest height, elbows leading and higher than the hands.',
      'Lower slowly.',
    ],
    watch: ['Do not go higher than the shoulders allow without pain.', 'No swinging.'],
  },
  'upright-barbell-row': {
    steps: [
      'Stand tall, the bar in an overhand grip a little narrower than shoulders.',
      'Pull it along the body to chest height, elbows leading and higher than the hands.',
      'Lower slowly.',
    ],
    watch: ['A wider grip is easier on the shoulders.', 'Stop below shoulder height if they pinch.'],
  },
  'db-floor-press': {
    steps: [
      'Lie on the floor, knees bent, a dumbbell in each hand over the chest.',
      'Lower until the upper arms touch the floor, pause briefly.',
      'Press back up.',
    ],
    watch: ['Do not bounce the elbows off the floor.', 'Elbows about 45° from the body.'],
  },
  'french-press': {
    steps: [
      'Stand tall, the bar held overhead with arms straight, grip about shoulder width.',
      'Bend only the elbows to lower the bar behind the head.',
      'Straighten the arms back up.',
    ],
    watch: ['Upper arms stay still and close to the head.', 'Keep the core tight, do not arch the back.'],
  },
  'db-tate-press': {
    steps: [
      'Lie on the bench, dumbbells pressed up over the chest, palms facing your feet.',
      'Let the elbows point out and bend them so the dumbbells come down to touch the chest.',
      'Press back up by straightening the elbows.',
    ],
    watch: ['The upper arms stay still; only the elbows bend.', 'Use a light weight.'],
  },
  'db-plank-extension': {
    steps: [
      'Get into a forearm plank with the hands on the dumbbell handles.',
      'Press up onto the hands by straightening the arms.',
      'Lower slowly back to the forearms.',
    ],
    watch: [
      'Keep the body straight, hips neither sagging nor raised.',
      'Press with the triceps, not by pushing the hips.',
    ],
  },
  skullcrusher: {
    steps: [
      'Lie on the bench, the bar held over the chest in a narrow grip.',
      'Bend only the elbows to lower the bar towards and just behind the head.',
      'Straighten the arms back up over the chest.',
    ],
    watch: ['Upper arms stay still, elbows pointing up.', 'Lower slowly: the bar comes close to your head.'],
  },
  'db-weighted-crunch': {
    steps: [
      'Lie on your back, knees bent and feet flat, a dumbbell held against the chest.',
      'Curl the shoulders off the floor by rolling the ribs towards the hips.',
      'Pause at the top, then lower slowly until the shoulder blades touch down.',
    ],
    watch: ['Keep the chin off the chest and the neck relaxed.', 'Lift with the abs; do not swing up.'],
  },
  'db-woodchop': {
    steps: [
      'Stand feet wide, a dumbbell held in both hands by the outside of one knee.',
      'Rotate and lift it diagonally across the body to above the opposite shoulder.',
      'Bring it back down along the same line under control.',
      'Do all the reps one way, then switch sides.',
    ],
    watch: ['Turn through the trunk and let the back foot pivot.', 'Keep the arms long; the abs do the work.'],
  },
  'reverse-curl': {
    steps: [
      'Stand tall, the bar held at arm length in an overhand grip, shoulder width.',
      'Curl the bar up to the shoulders keeping the palms down.',
      'Lower slowly to straight arms.',
    ],
    watch: ['Elbows stay at your sides.', 'Keep the wrists straight; use a lighter weight than a normal curl.'],
  },
  'db-incline-curl': {
    steps: [
      'Sit back on a bench inclined to about 45°, arms hanging straight down, palms forward.',
      'Curl both dumbbells up without moving the upper arms.',
      'Lower slowly until the arms are fully straight.',
    ],
    watch: ['Upper arms stay vertical; the shoulders do not come forward.', 'Keep the head and back on the bench.'],
  },
  'standing-calf-raise': {
    steps: [
      'Take the bar from the rack across the upper back.',
      'Stand with the balls of the feet on the block, heels free.',
      'Lower the heels as far as is comfortable, then rise as high as you can on the toes.',
      'Pause at the top before lowering.',
    ],
    watch: ['Knees straight but not locked.', 'Full range each rep; no bouncing at the bottom.'],
  },
  'db-incline-bench-press': {
    steps: [
      'Sit on a bench inclined to about 30°, dumbbells on the thighs, then lie back and bring them to the shoulders.',
      'Press them up over the upper chest until the arms are straight.',
      'Lower slowly back to the sides of the chest.',
    ],
    watch: ['Shoulder blades pulled back and down.', 'Elbows at about 45° from the body, not flared straight out.'],
  },
  'db-flyes': {
    steps: [
      'Lie on the bench, dumbbells pressed up over the chest, palms facing each other.',
      'With a slight bend in the elbows, open the arms wide until you feel a stretch in the chest.',
      'Bring the dumbbells back together over the chest in the same arc.',
    ],
    watch: ['Keep the elbow bend fixed: it is a hug, not a press.', 'Do not lower below the shoulders; go light.'],
  },
  'floor-press': {
    steps: [
      'Lie on the floor under the bar in the rack, knees bent, feet flat.',
      'Take the bar slightly wider than shoulder width and lift it out over the chest.',
      'Lower until the upper arms touch the floor, pause, and press back up.',
    ],
    watch: ['Let the arms settle on the floor; do not bounce them.', 'Elbows at about 45° from the body.'],
  },
  'wrist-curl': {
    steps: [
      'Sit on the bench, forearms on the thighs, the bar held palms up with the wrists just past the knees.',
      'Let the bar roll down towards the fingers.',
      'Curl it back up with the wrists as high as you can.',
    ],
    watch: ['Only the wrists move; the forearms stay on the thighs.', 'Slow and controlled; it is a small muscle.'],
  },
  'reverse-wrist-curl': {
    steps: [
      'Sit on the bench, forearms on the thighs, the bar held palms down with the wrists just past the knees.',
      'Lower the bar by bending the wrists down.',
      'Lift it with the backs of the hands as high as you can.',
    ],
    watch: ['Only the wrists move.', 'Use clearly less weight than in the wrist curl.'],
  },
  'hip-thrust': {
    steps: [
      'Sit on the floor with the shoulder blades against the side of the bench, the bar over the hips.',
      'Feet flat, about hip width, knees bent.',
      'Drive through the heels and lift the hips until the body is straight from shoulders to knees.',
      'Squeeze the glutes at the top, then lower under control.',
    ],
    watch: [
      'Chin tucked and ribs down; do not arch the lower back at the top.',
      'Shins vertical at the top. A pad on the bar spares the hips.',
    ],
  },
  'db-step-up': {
    steps: [
      'Stand facing the bench, a dumbbell in each hand at your sides.',
      'Place one whole foot on the bench and step up by pushing through that heel.',
      'Stand tall on the bench, then step back down with the same leg leading down last.',
      'Do all the reps on one leg, then switch.',
    ],
    watch: ['Lift with the front leg; do not push off the back foot.', 'Keep the knee in line with the toes.'],
  },
  'db-romanian-deadlift': {
    steps: [
      'Stand with a dumbbell in each hand in front of the thighs, knees slightly bent.',
      'Push the hips back and lower the dumbbells along the legs, back flat.',
      'Stop when you feel a stretch in the hamstrings, about mid shin.',
      'Drive the hips forward to stand back up.',
    ],
    watch: ['The back stays flat; the movement is at the hips.', 'Dumbbells stay close to the legs.'],
  },
  'db-pullover': {
    steps: [
      'Lie on the bench holding one dumbbell with both hands over the chest, arms almost straight.',
      'Lower it in an arc behind the head until the upper arms are in line with the body.',
      'Pull it back over the chest along the same arc.',
    ],
    watch: ['Keep the elbow bend fixed.', 'Keep the ribs down; do not arch the back as the weight goes back.'],
  },
  'good-morning': {
    steps: [
      'Take the bar from the rack across the upper back, feet hip width, knees slightly bent.',
      'Push the hips back and bend forward with a flat back until the torso is near level.',
      'Drive the hips forward to stand back up.',
    ],
    watch: ['Back flat and chest up the whole time.', 'Start light: the lower back takes a long lever.'],
  },
  'pendlay-row': {
    steps: [
      'Stand over the bar, feet hip width, and bend over with a flat back until the torso is near level.',
      'Take an overhand grip a little wider than shoulder width.',
      'Pull the bar explosively from the floor to the lower chest.',
      'Lower it back to the floor and let it settle before the next rep.',
    ],
    watch: [
      'The torso stays still; do not stand up to lift the bar.',
      'Each rep starts from a dead stop on the floor.',
    ],
  },
  'front-squat': {
    steps: [
      'Take the bar from the rack on the front of the shoulders, fingers under it, elbows high.',
      'Stand feet shoulder width and squat down with an upright torso.',
      'Go as deep as you can with a flat back, then stand back up.',
    ],
    watch: ['Keep the elbows high so the bar does not roll forward.', 'Knees follow the toes.'],
  },
  'db-bulgarian-split-squat': {
    steps: [
      'Stand a long step in front of the bench, the top of the back foot on it, a dumbbell in each hand.',
      'Lower straight down until the front thigh is about level.',
      'Push through the front heel to come back up.',
      'Do all the reps on one leg, then switch.',
    ],
    watch: ['The front knee follows the toes.', 'Torso upright; the back leg only balances.'],
  },
  'db-lateral-raise': {
    steps: [
      'Stand tall, a dumbbell in each hand at your sides, elbows slightly bent.',
      'Raise the arms out to the sides up to shoulder height.',
      'Lower slowly back down.',
    ],
    watch: ['Lead with the elbows; do not shrug the shoulders.', 'Go light and do not swing.'],
  },
  'db-arnold-press': {
    steps: [
      'Sit on the chair, dumbbells in front of the shoulders, palms facing you.',
      'Press them up, turning the palms forward as they rise.',
      'Straighten the arms overhead, then reverse the turn on the way down.',
    ],
    watch: ['Keep the back against the chair; do not lean back.', 'A smooth turn, no jerking at the top.'],
  },
  'push-press': {
    steps: [
      'Take the bar from the rack on the front of the shoulders, grip just wider than shoulders.',
      'Dip a few centimetres at the knees, torso upright.',
      'Drive up with the legs and press the bar overhead to straight arms.',
      'Lower it back to the shoulders, bending the knees slightly to cushion it.',
    ],
    watch: ['The dip is short and straight down, not a squat.', 'Move the head back for the bar, then under it.'],
  },
  shrug: {
    steps: [
      'Take the bar from the rack and stand with it at arm length in front of the thighs.',
      'Lift the shoulders straight up towards the ears as high as you can.',
      'Hold for a moment, then lower slowly.',
    ],
    watch: ['Straight up and down; do not roll the shoulders.', 'The arms stay straight; do not pull with them.'],
  },
  'db-shrug': {
    steps: [
      'Stand tall, a dumbbell in each hand at your sides.',
      'Lift the shoulders straight up towards the ears as high as you can.',
      'Hold for a moment, then lower slowly.',
    ],
    watch: ['Straight up and down; do not roll the shoulders.', 'Keep the head still and the arms straight.'],
  },
  'close-grip-bench-press': {
    steps: [
      'Lie on the bench under the bar, hands at shoulder width.',
      'Lift it out and lower it to the lower chest, elbows close to the body.',
      'Press back up to straight arms.',
    ],
    watch: [
      'Hands no narrower than the shoulders; it strains the wrists.',
      'Elbows stay tucked; use a spotter or the rack safeties.',
    ],
  },
  'db-overhead-triceps-extension': {
    steps: [
      'Sit tall on the chair, one dumbbell held in both hands overhead.',
      'Bend only the elbows to lower it behind the head.',
      'Straighten the arms back up overhead.',
    ],
    watch: ['Elbows point up and stay close to the head.', 'Keep the ribs down; do not arch the back.'],
  },
  'db-kickback': {
    steps: [
      'Put one knee and hand on the bench, back flat, a dumbbell in the other hand.',
      'Bring that upper arm along your side, parallel to the floor, elbow bent.',
      'Straighten the arm back until it is in line with the body.',
      'Bend it back slowly. Do all the reps, then switch.',
    ],
    watch: ['The upper arm stays still; only the forearm moves.', 'Go light and pause at full extension.'],
  },
}
