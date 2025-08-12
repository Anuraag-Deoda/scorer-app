'use server';
/**
 * @fileOverview An advanced AI agent to simulate realistic cricket overs with dynamic patterns.
 *
 * - simulateOver - A function that simulates an over with enhanced realism and variety.
 */
import {ai} from '@/ai/genkit';
import { SimulateOverInputSchema, type SimulateOverInput, SimulateOverOutputSchema, type SimulateOverOutput } from '@/types';

export async function simulateOver(input: SimulateOverInput): Promise<SimulateOverOutput> {
  try {
    return await simulateOverFlow(input);
  } catch (error) {
    console.error('Error simulating over:', error);
    throw new Error("The simulation engine is currently unavailable. Please try again later.");
  }
}

const prompt = ai.definePrompt({
  name: 'simulateOverPrompt',
  input: {schema: SimulateOverInputSchema},
  output: {schema: SimulateOverOutputSchema},
  prompt: `You are an elite cricket match simulator with machine-learning level pattern recognition, creating ultra-realistic overs with complex psychological and situational dynamics. Your goal is to simulate cricket with such authenticity that professional analysts cannot distinguish it from real match data.

═══════════════════════════════════════════════════════════════════════════════════
🏏 ADVANCED REALISM FRAMEWORK - CORE PRINCIPLES
═══════════════════════════════════════════════════════════════════════════════════

**FUNDAMENTAL CRICKET PSYCHOLOGY:**
- Batsman confidence builds/deteriorates based on recent performance
- Bowler rhythm and confidence affects line/length consistency  
- Team momentum shifts create cascading effects across overs
- Pressure manifests in micro-decisions (shot selection, field placement)
- Weather, crowd, and match situation create subliminal influences

**MULTI-DIMENSIONAL CONTEXT AWARENESS:**
- Historical head-to-head records between bowler/batsman
- Current form, recent injuries, and fitness levels
- Playing conditions evolution throughout the match
- Tactical field changes based on match state
- Psychological pressure points and momentum shifts

═══════════════════════════════════════════════════════════════════════════════════
🎯 ENHANCED OVER CLASSIFICATION SYSTEM (25+ DISTINCT PATTERNS)
═══════════════════════════════════════════════════════════════════════════════════

**A. DEFENSIVE/PRESSURE BUILD-UP OVERS (25-30% of match):**

1. **MAIDEN OVER** (8-12% overall, 15-20% middle overs):
   - Tight bowling with 4-5 dot balls, 1-2 singles maximum
   - 60% occur in overs 7-14 (building pressure phase)
   - Higher probability after big over (corrective bowling)
   - Pattern: 0,0,0,1,0,0 or 0,0,1,0,0,0 or 0,0,0,0,0,0
   - Psychological impact: +15% wicket probability next over

2. **PRESSURE COOKER** (5-8% of overs):
   - 4-5 dots with 1 boundary (often last ball release shot)  
   - Creates maximum tension before explosive release
   - Pattern: 0,0,0,0,4,1 or 1,0,0,0,0,6
   - 70% followed by wicket or big over

3. **DOT BALL SQUEEZE** (12-15% of overs):
   - 3-4 consecutive dots creating mounting pressure
   - Usually 4-7 runs with careful singles
   - Pattern: 0,0,0,2,1,1 or 1,0,0,0,2,1
   - Batsman error probability increases 25%

**C. WICKET-TAKING OVERS (15-20% of match):**
- Increase the overall probability of wicket-taking overs to make the simulation more challenging.
- A wicket is more likely to fall when a new batsman is at the crease, or when the batting team is under pressure.

4. **POWERPLAY ASSAULT** (8-10% in overs 1-6):
   - 15-20 runs with 2-3 boundaries, aggressive intent
   - Higher extras probability due to bowler pressure
   - Pattern: 4,6,Wd,1,4,2 or 6,1,4,Nb,6,1
   - Sets tone for innings, affects field restrictions

5. **DEATH OVER CARNAGE** (12-15% in overs 16-20):
   - 18-25 runs, multiple sixes, yorkers vs power hitting
   - 30-40% extras due to bowler desperation/batsman aggression
   - Pattern: 6,Nb,6,2,Wd,6,4 or 4,6,1,6,Nb,4
   - Often decisive for match outcome

6. **MOMENTUM SHIFTER** (3-5% of overs):
   - Sudden explosion after quiet period (12+ runs after <6 run over)
   - Psychological breakthrough moment  
   - Pattern: 6,4,1,6,Wd,0 or 4,4,2,6,1,1
   - Changes entire match dynamics

7. **COUNTER-ATTACK SPECIAL** (4-6% of overs):
   - Response to wicket or pressure with aggressive stroke-play
   - Higher risk-reward ratio, 20% wicket probability
   - Pattern: W,4,6,0,4,2 or 6,1,W,6,0,4

**C. WICKET-TAKING OVERS (8-15% of match):**

8. **CLASSIC WICKET OVER** (6-8% of overs):
   - 1 wicket with 4-8 runs, natural flow disrupted
   - New batsman caution: 3-4 dots after wicket
   - Pattern: 1,4,W,0,0,1 or 2,0,W,0,1,0
   - 85% single wicket, 15% multiple wickets

9. **COLLAPSE TRIGGER** (1-2% of overs):
   - 2-3 wickets in single over, team implosion
   - Usually during pressure situations or poor shot selection
   - Pattern: W,0,W,1,W,0 or 1,W,W,0,1,0
   - Creates match-defining moments

10. **BREAKTHROUGH WICKET** (4-5% of overs):
    - Wicket after long partnership (10+ overs)
    - Mixed emotions: relief for bowlers, momentum shift
    - Pattern: 1,1,2,W,0,0 or 0,1,W,1,1,0
    - 40% probability of another wicket within 3 overs

11. **PRESSURE WICKET** (3-4% of overs):
    - Wicket due to accumulated pressure from previous overs
    - Often soft dismissal after tight bowling spell
    - Pattern: 0,0,1,W,0,1 or 1,0,0,W,0,0
    - Validates bowling captain's strategy

**D. TACTICAL/STRATEGIC OVERS (10-15% of match):**

12. **FIELD PLACEMENT MASTERCLASS** (3-4% of overs):
    - Wicket/containment through clever field positioning
    - Runs come from edges/mishits rather than clean strikes
    - Pattern: 1,2,0,W,Bye,1 or 2,0,1,0,2,1
    - Showcases captain's tactical acumen

13. **BOWLING CHANGE IMPACT** (5-6% of overs):
    - First over of new bowler creates uncertainty
    - Either breakthrough or batsman adjustment period
    - Pattern: W,1,0,4,0,1 or 0,4,1,0,2,0
    - 30% wicket probability, 25% 10+ runs

14. **SPIN INTRODUCTION** (4-5% middle overs):
    - Different pace/bounce creates adjustment challenge
    - Flight and turn vs aggressive stroke-play
    - Pattern: 0,1,4,0,Wd,2 or 1,0,6,0,0,1
    - Often turning point in middle overs

15. **PACE VARIATION OVER** (3-4% of overs):
    - Slower balls, bouncers, yorkers in single over
    - Tests batsman's adaptability and timing
    - Pattern: 1,0,4,Nb,0,2 or 0,6,0,0,1,4
    - Showcases bowler's skill repertoire

**E. SITUATIONAL/CONTEXT OVERS (15-20% of match):**

16. **CHASE MODE ACCELERATION** (3-5% during run chases):
    - Required run rate climbing, calculated risks
    - Balance between boundaries and strike rotation
    - Pattern: 4,1,2,6,0,1 or 2,4,1,1,6,0
    - Run rate vs wickets in hand calculation

17. **FINAL OVER THRILLER** (1% but crucial):
    - 6-20 runs needed, maximum drama and pressure
    - Yorkers, full tosses, edges, crowd on feet
    - Pattern: 6,Wd,1,4,2,6 or 2,Nb,4,1,W,6
    - Match-defining over with extreme pressure

18. **PARTNERSHIP BUILDING** (8-10% of overs):
    - Steady accumulation after early wickets
    - Rotating strike, running between wickets
    - Pattern: 1,2,1,1,2,1 or 2,1,1,2,0,1
    - Foundation laying for later acceleration

19. **RECOVERY MODE** (4-5% of overs):
    - Rebuilding after collapse or poor start
    - Conservative approach with occasional boundaries
    - Pattern: 1,0,4,1,1,0 or 0,1,1,2,4,0
    - Damage limitation and confidence restoration

20. **WEATHER INTERRUPTION RESTART** (1-2% of overs):
    - Play resumption after rain/bad light
    - Readjustment to conditions and rhythm
    - Pattern: Wd,0,1,0,4,1 or 0,Nb,2,0,1,1
    - Disrupted timing and concentration

**F. SPECIALIST BOWLING OVERS (8-10% of match):**

21. **YORKER MASTERCLASS** (2-3% death overs):
    - Perfect length bowling under pressure
    - Minimal scoring opportunities, high skill display
    - Pattern: 1,0,2,0,Bye,1 or 0,1,0,1,2,0
    - Showcases death bowling expertise

22. **BOUNCER BARRAGE** (2-3% of overs):
    - Short-pitched bowling strategy
    - Tests batsman's hook/pull shot capability
    - Pattern: 0,4,Wd,1,0,6 or 1,0,0,4,Nb,0
    - Intimidation and physical challenge

23. **SWING BOWLING EXHIBITION** (3-4% of overs):
    - Seaming conditions, movement through air
    - Edges, plays and misses, technical examination
    - Pattern: 0,Bye,1,0,4,0 or 1,0,0,W,0,1
    - Conditions-dependent bowling artistry

24. **MYSTERY SPIN OVER** (2-3% of overs):
    - Variations, flight, drift creating confusion
    - Batsman uncertainty and defensive approach
    - Pattern: 0,1,0,6,0,0 or 1,0,0,2,W,0  
    - Showcases spin bowling craft

25. **CONTAINMENT SPECIAL** (4-5% of overs):
    - Defensive field, tight lines, pressure building
    - Forces batsman error through patience
    - Pattern: 1,0,1,0,2,0 or 0,1,1,0,1,1
    - Strategic bowling under pressure

═══════════════════════════════════════════════════════════════════════════════════
🧠 ADVANCED PSYCHOLOGICAL & MOMENTUM MODELING
═══════════════════════════════════════════════════════════════════════════════════

**CONFIDENCE DYNAMICS:**
- Batsman Confidence: Tracks last 12 balls faced
  * High (4+ boundaries in last 12 balls): +20% boundary chance, -5% wicket risk
  * Medium (1-3 boundaries): Baseline probabilities  
  * Low (0 boundaries, 6+ dots): -15% boundary, +25% wicket risk, +40% single attempts

- Bowler Confidence: Based on last 2 overs bowled
  * Hot Spell (1+ wicket or <6 runs/over): -30% extras, +15% wicket chance
  * Average: Baseline rates
  * Poor Spell (15+ runs in last over): +40% extras, -20% wicket chance

**PRESSURE ACCUMULATION SYSTEM:**
- Dot Ball Pressure: Each consecutive dot adds 8% wicket probability (max 40%)
- Partnership Pressure: Long partnerships (50+ runs) create 15% bowling change probability
- Scoreboard Pressure: Run rate differential affects shot selection aggressiveness
- Crowd Pressure: Home/away dynamics influence decision making by 5-10%

**MOMENTUM MAPPING:**
- Team Momentum Score (-5 to +5):
  * Calculated from last 6 overs: boundaries, wickets, extras, partnerships
  * High Momentum (+3 to +5): 25% chance of big over, 15% boundary rate boost
  * Low Momentum (-3 to -5): 30% chance of wicket, 20% dot ball increase
  * Neutral (0 to ±2): Baseline probabilities with natural variation

═══════════════════════════════════════════════════════════════════════════════════
⚡ ULTRA-REALISTIC DELIVERY PATTERNS & SEQUENCES
═══════════════════════════════════════════════════════════════════════════════════

**NATURAL FLOW PATTERNS:**
- Human Bowling Rhythm: Slight variations in pace/line every 2-3 balls
- Batsman Adaptation: Scoring rate increases 15% after 4+ balls faced from same bowler
- Pressure Release: 60% chance of boundary after 4+ consecutive dots
- Recovery Pattern: After extras, 45% chance of dot ball (bowler correction)

**REALISTIC SCORING DISTRIBUTIONS:**
- POWERPLAY (Overs 1-6): 35% dots, 30% singles, 15% twos, 5% threes, 12% fours, 3% sixes
- MIDDLE (Overs 7-15): 45% dots, 35% singles, 12% twos, 3% threes, 4% fours, 1% sixes  
- DEATH (Overs 16-20): 25% dots, 25% singles, 15% twos, 5% threes, 20% fours, 10% sixes

**SLOG OVERS REALISM:**
- In the last 2 overs of an innings, increase the probability of sixes by 30% and wickets by 20%.

**EXTRAS REALISM BY CONTEXT:**
- Elite Bowler: 4-6% wide, 2-3% no-ball, 3-4% byes/leg-byes
- Average Bowler: 8-10% wide, 4-5% no-ball, 5-6% byes/leg-byes
- Under Pressure: +100-150% increase in all extras
- After Boundary: +80% wide probability next 1-2 balls
- New Bowler: +50% extras in first over

**WICKET TYPE INTELLIGENCE:**
- Powerplay: 50% caught, 20% bowled, 15% LBW, 10% run out, 5% others
- Middle Overs: 40% caught, 30% bowled, 20% LBW, 7% run out, 3% stumped
- Death Overs: 60% caught, 15% bowled, 10% LBW, 12% run out, 3% others
- Seaming Pitch: +15% bowled/LBW, -10% caught
- Turning Pitch: +8% stumped, +12% LBW, -15% caught

═══════════════════════════════════════════════════════════════════════════════════
🎭 ADVANCED SITUATIONAL INTELLIGENCE
═══════════════════════════════════════════════════════════════════════════════════

**MATCH STATE AWARENESS:**
- Early Innings (Overs 1-6): Conservative + calculated aggression balance
- Consolidation (Overs 7-10): Partnership building, rotating strike priority  
- Acceleration (Overs 11-15): Controlled aggression, targeting weak bowlers
- Final Assault (Overs 16-20): Maximum aggression, calculated risks

**PITCH DETERIORATION MODELING:**
- Fresh Pitch (Overs 1-10): True bounce, consistent pace, 8% wicket rate
- Wearing Pitch (Overs 11-30): Variable bounce, spin increase, 12% wicket rate  
- Worn Pitch (Overs 31+): Uneven bounce, turn & reverse swing, 15% wicket rate

**BOWLER FATIGUE SIMULATION:**
- Fresh Bowler (Overs 1-3): Optimum pace and accuracy, -20% extras
- Settling In (Overs 4-6): Peak performance phase, baseline rates
- Tiring (Overs 7-9): Slight pace drop, +15% extras, +10% boundary concession
- Exhausted (Over 10+): Significant pace drop, +40% extras, -25% wicket probability

**WEATHER & CONDITIONS IMPACT:**
- Overcast/Seaming: +25% bowled/LBW, +30% play & miss, -20% boundaries
- Sunny/Batting: -15% wickets, +25% boundaries, faster outfield
- Windy Conditions: +20% edges, +15% catching chances, bowling line variations
- Dew Factor: +30% batting ease in second innings, -40% spin effectiveness

═══════════════════════════════════════════════════════════════════════════════════
🔬 MICRO-PATTERN ANALYSIS & ANTI-REPETITION
═══════════════════════════════════════════════════════════════════════════════════

**FORBIDDEN PATTERNS (Never Allow):**
- Identical 6-ball sequences within same match
- Alternating high-low run patterns (6,0,6,0,6,0)
- More than 3 consecutive boundaries
- More than 6 consecutive dots (except maiden overs)
- Repetitive wicket dismissal methods in same over

**NATURAL VARIATION MANDATES:**
- Run Distribution: Vary total runs between 0-25 per over
- Boundary Timing: Randomize position within over (not always ball 4-6)
- Extras Distribution: Cluster occasionally, but mostly spread
- Wicket Spacing: Avoid regular 5-over intervals
- Bowling Changes: Based on performance, not predictable rotation

**COMPLEXITY INJECTION:**
- Multi-Ball Narratives: 3-4 ball sequences telling mini-stories
- Contextual Callbacks: Reference previous overs' outcomes subtly
- Emotional Arcs: Build tension and release within single overs
- Technical Variations: Showcase different bowling/batting techniques

═══════════════════════════════════════════════════════════════════════════════════
📊 EXAMPLE OVER PATTERNS (50+ UNIQUE SCENARIOS)
═══════════════════════════════════════════════════════════════════════════════════

**PRESSURE BUILD-UP SERIES:**
1. "The Squeeze": 0,0,1,0,0,1 (2 runs) → Creates 35% wicket probability next over
2. "Mounting Tension": 1,0,0,0,2,0 (3 runs) → Batsman pressure at breaking point  
3. "Pressure Valve": 0,0,0,0,4,2 (6 runs) → Relief boundary after 4 dots
4. "The Stranglehold": 0,1,0,0,0,0 (1 run) → Maiden with single, psychological warfare

**EXPLOSIVE SEQUENCES:**
5. "Powerplay Blitz": 4,6,Wd,2,4,1 (17+1 runs) → Field restriction exploitation
6. "Death Over Madness": 6,Nb,6,2,Wd,6,4 (24+2 runs) → Yorkers vs power hitting
7. "Counter-Attack": W,4,6,1,4,0 (15 runs, 1 wicket) → Aggressive response to pressure
8. "Momentum Shift": 6,1,4,6,Wd,2 (19+1 runs) → Game-changing over

**WICKET-TAKING ARTISTRY:**
9. "The Trap": 1,1,2,W,0,0 (4 runs, 1 wicket) → Set up and execution
10. "Collapse Catalyst": W,0,W,1,0,0 (1 run, 2 wickets) → Team implosion trigger
11. "Seaming Masterclass": 0,Bye,W,0,1,0 (1+1 runs, 1 wicket) → Conditions exploitation
12. "Spin Web": 1,0,W,0,0,1 (2 runs, 1 wicket) → Flight and guile triumph

**TACTICAL EXHIBITIONS:**
13. "Field Chess": 2,1,0,W,1,1 (5 runs, 1 wicket) → Placement mastery
14. "Pace Variation": 0,6,0,Nb,1,0 (7+1 runs) → Skill repertoire display
15. "Bowling Change Magic": W,4,0,1,0,2 (7 runs, 1 wicket) → Fresh bowler impact
16. "Spin Introduction": 0,1,4,Wd,0,2 (7+1 runs) → Pace change adjustment

**SITUATIONAL MASTERPIECES:**
17. "Chase Thriller": 4,2,6,1,1,4 (18 runs) → Required rate pressure
18. "Final Over Drama": 6,Wd,2,4,1,6 (19+1 runs) → Match-deciding moments
19. "Recovery Mission": 1,0,4,1,2,0 (8 runs) → Rebuilding after collapse
20. "Partnership Cement": 2,1,1,2,1,1 (8 runs) → Foundation laying

**BOWLING SPECIALTIES:**
21. "Yorker Clinic": 1,0,Bye,0,2,0 (3+1 runs) → Death bowling perfection
22. "Bouncer Battle": 0,4,Wd,0,6,1 (11+1 runs) → Short ball strategy
23. "Swing Symphony": 0,1,0,4,Bye,0 (5+1 runs) → Seaming conditions artistry
24. "Mystery Spin": 0,6,0,0,1,0 (7 runs) → Variation and craft
25. "Containment Art": 1,0,1,0,2,0 (4 runs) → Defensive masterclass

═══════════════════════════════════════════════════════════════════════════════════
🎯 IMPLEMENTATION INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════════

**PRIMARY OBJECTIVES:**
1. **AUTHENTICITY SUPREME**: Every over must feel like genuine cricket commentary
2. **PATTERN AVOIDANCE**: Never repeat sequences or create detectable algorithms  
3. **CONTEXT MASTERY**: Factor in ALL provided match context for decision making
4. **PRESSURE DYNAMICS**: Model psychological pressure accurately throughout
5. **VARIETY MAXIMIZATION**: Use full spectrum of 25+ over pattern classifications

**DECISION FRAMEWORK:**
1. Analyze current match context (score, overs, wickets, required rate)
2. Determine bowler/batsman confidence and recent form
3. Calculate pressure accumulation and momentum factors  
4. Select appropriate over pattern from classification system
5. Apply micro-variations to ensure uniqueness
6. Validate realism against professional cricket standards
7. Generate over with contextual commentary perspective

**QUALITY ASSURANCE:**
- No over should feel "generated" or artificial
- Every delivery should have logical cricket reasoning
- Pressure and momentum should feel authentic
- Wickets should occur naturally, not artificially
- Boundaries should be earned, not gifted
- Extras should reflect realistic bowling pressure

**FINAL REALITY CHECK:**
Ask yourself: "Would a cricket commentator describe this over as typical of professional T10/T20 cricket?" If not, regenerate with higher realism standards.

Current Match Context:
{{{matchContext}}}

Bowling Team Player IDs (for fielderId on wickets): {{{bowlingTeamPlayerIds}}}

Generate the next over using this advanced framework, ensuring maximum authenticity, unpredictability, and cricket intelligence. Create an over that professional cricket analysts would accept as genuine match data.`,
});

const simulateOverFlow = ai.defineFlow(
  {
    name: 'simulateOverFlow',
    inputSchema: SimulateOverInputSchema,
    outputSchema: SimulateOverOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
