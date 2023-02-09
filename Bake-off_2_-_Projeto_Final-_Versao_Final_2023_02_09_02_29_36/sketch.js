// Bakeoff #2 - Seleção de Alvos Fora de Alcance
// IPM 2021-22, Período 3
// Entrega: até dia 22 de Abril às 23h59 através do Fenix
// Bake-off: durante os laboratórios da semana de 18 de Abril

// p5.js reference: https://p5js.org/reference/

// Database (CHANGE THESE!)
const GROUP_NUMBER   = "32-AL";      // Add your group number here as an integer (e.g., 2, 3)
const BAKE_OFF_DAY   = false;  // Set to 'true' before sharing during the bake-off day

// Target and grid properties (DO NOT CHANGE!)
let PPI, PPCM;
let TARGET_SIZE;
let TARGET_PADDING, MARGIN, LEFT_PADDING, TOP_PADDING;
let continue_button;
let inputArea        = {x: 0, y: 0, h: 0, w: 0}    // Position and size of the user input area

// Metrics
let testStartTime, testEndTime;// time between the start and end of one attempt (54 trials)
let hits 			 = 0;      // number of successful selections
let misses 			 = 0;      // number of missed selections (used to calculate accuracy)
let database;                  // Firebase DB  

// Study control parameters
let draw_targets     = false;  // used to control what to show in draw()
let trials 			 = [];     // contains the order of targets that activate in the test
let current_trial    = 0;      // the current trial number (indexes into trials array above)
let attempt          = 0;      // users complete each test twice to account for practice (attemps 0 and 1)
let fitts_IDs        = [];     // add the Fitts ID for each selection here (-1 when there is a miss)
let snap_target_x;
let snap_target_y;


// Target class (position and width)
class Target
{
  constructor(x, y, w)
  {
    this.x = x;
    this.y = y;
    this.w = w;
  }
}

// Runs once at the start
function setup()
{
  createCanvas(700, 500);    // window size in px before we go into fullScreen()
  frameRate(60);             // frame rate (DO NOT CHANGE!)
  
  randomizeTrials();         // randomize the trial order at the start of execution
  
  textFont("Arial", 18);     // font size for the majority of the text
  drawUserIDScreen();        // draws the user start-up screen (student ID and display size)
}

// Runs every frame and redraws the screen
function draw()
{
  fill(color(255,255,255));
  if (draw_targets)
  {     
    // The user is interacting with the 6x3 target grid
    background(color(0,0,0));        // sets background to black
    
    // Print trial count at the top left-corner of the canvas
    fill(color(255,255,255));
    textAlign(LEFT);
    text("Trial " + (current_trial + 1) + " of " + trials.length, 50, 20);
    
    // Draw all 18 targets
	for (var i = 0; i < 18; i++) drawTarget(i);
    
    noStroke();
    
    // Draw the user input area
    drawInputArea()
    
    drawLabels()

    // Draw the virtual cursor
    let x = map(mouseX, inputArea.x, inputArea.x + inputArea.w, 0, width)
    let y = map(mouseY, inputArea.y, inputArea.y + inputArea.h, 0, height)

    noStroke();
    fill(color(255,255,0));
    circle(x, y, 0.5 * PPCM);
    
    let snappedtarget = SnapTarget(x,y);
    
    if(snappedtarget!=-1){
      snap_target_x = getTargetBounds(snappedtarget).x;
      snap_target_y = getTargetBounds(snappedtarget).y;
    }
    else{
      snap_target_x = 100000000;
      snap_target_y = 100000000;
    }
    
    fill(color(255,255,255));
    circle(snap_target_x, snap_target_y, 0.5 * PPCM);
    
  }
}


function calculateFittsIndex(current_trial, snap_target_x, snap_target_y)
{ 
  if ((current_trial > 0) && (current_trial < trials.length)){ 
    let current_difficulty;
    let distance;  
    let current_target = getTargetBounds(trials[current_trial]);
    
    distance = dist(current_target.x, current_target.y, snap_target_x, snap_target_y);
    current_difficulty = Math.log2((distance/TARGET_SIZE) +1);
    fitts_IDs[current_trial] = current_difficulty;
  }
}

// Print and save results at the end of 54 trials
function printAndSavePerformance()
{
  // DO NOT CHANGE THESE! 
  let accuracy			= parseFloat(hits * 100) / parseFloat(hits + misses);
  let test_time         = (testEndTime - testStartTime) / 1000;
  let time_per_target   = nf((test_time) / parseFloat(hits + misses), 0, 3);
  let penalty           = constrain((((parseFloat(95) - (parseFloat(hits * 100) / parseFloat(hits + misses))) * 0.2)), 0, 100);
  let target_w_penalty	= nf(((test_time) / parseFloat(hits + misses) + penalty), 0, 3);
  let timestamp         = day() + "/" + month() + "/" + year() + "  " + hour() + ":" + minute() + ":" + second();
  
  noFill();
  background(color(0,0,0));   // clears screen
  fill(color(255,255,255));   // set text fill color to white
  text(timestamp, 10, 20);    // display time on screen (top-left corner)
  
  textAlign(CENTER);
  text("Attempt " + (attempt + 1) + " out of 2 completed!", width/2, 60); 
  text("Hits: " + hits, width/2, 100);
  text("Misses: " + misses, width/2, 120);
  text("Accuracy: " + accuracy + "%", width/2, 140);
  text("Total time taken: " + test_time + "s", width/2, 160);
  text("Average time per target: " + time_per_target + "s", width/2, 180);
  text("Average time for each target (+ penalty): " + target_w_penalty + "s", width/2, 220);
  
  // Print Fitts IDS (one per target, -1 if failed selection, optional)
  text("Fitts Index of Performance", width/2, 260);
  
  let start_printing_height = 260; // Arbitrary number that fits well
  let printing_width = width/4;
  let printing_height = start_printing_height;
  for (let i = 1; i < trials.length+1; i++){
    
    // If half of the Fitts IDs have been printed, 
    // printing height returns to baseline and change the printing width
    if (i == 28){
      printing_height = start_printing_height;
      printing_width = 3*width/4;
    }
    printing_height += 18;
    
  
    if (i == 1) {
      text("Target 1: ---", printing_width, printing_height);
    }
    else if (fitts_IDs[i-1] != -1){
      text("Target" + i + ": " + nf(parseFloat(fitts_IDs[i-1]), 0, 3), printing_width, printing_height);
    }
    else{
      text("Target" + i + ": MISSED", printing_width, printing_height);
    }
      
  }

  // Saves results (DO NOT CHANGE!)
  let attempt_data = 
  {
        project_from:       GROUP_NUMBER,
        assessed_by:        student_ID,
        test_completed_by:  timestamp,
        attempt:            attempt,
        hits:               hits,
        misses:             misses,
        accuracy:           accuracy,
        attempt_duration:   test_time,
        time_per_target:    time_per_target,
        target_w_penalty:   target_w_penalty,
        fitts_IDs:          fitts_IDs
  }
  
  // Send data to DB (DO NOT CHANGE!)
  if (BAKE_OFF_DAY)
  {
    // Access the Firebase DB
    if (attempt === 0)
    {
      firebase.initializeApp(firebaseConfig);
      database = firebase.database();
    }
    
    // Add user performance results
    let db_ref = database.ref('G' + GROUP_NUMBER);
    db_ref.push(attempt_data);
  }
}

// Mouse button was pressed - lets test to see if hit was in the correct target
function mousePressed() 
{
  // Only look for mouse releases during the actual test
  // (i.e., during target selections)
  if (draw_targets)
  {
    // Get the location and size of the target the user should be trying to select
    let target = getTargetBounds(trials[current_trial]);   
    
    // Check to see if the virtual cursor is inside the target bounds,
    // increasing either the 'hits' or 'misses' counters
        
    if (insideInputArea(mouseX, mouseY))
    {
      let virtual_x = map(mouseX, inputArea.x, inputArea.x + inputArea.w, 0, width)
      let virtual_y = map(mouseY, inputArea.y, inputArea.y + inputArea.h, 0, height)

      if (dist(target.x, target.y, snap_target_x, snap_target_y) < target.w/2) hits++;
      else {
        fitts_IDs[current_trial] = -1;
        misses++;
      }
      
      current_trial++;                 // Move on to the next trial/target
      
      calculateFittsIndex(current_trial, snap_target_x, snap_target_y);
      
    }

    // Check if the user has completed all 54 trials
    if (current_trial === trials.length)
    {
      testEndTime = millis();
      draw_targets = false;          // Stop showing targets and the user performance results
      printAndSavePerformance();     // Print the user's results on-screen and send these to the DB
      attempt++;                      
      
      // If there's an attempt to go create a button to start this
      if (attempt < 2)
      {
        continue_button = createButton('START 2ND ATTEMPT');
        continue_button.mouseReleased(continueTest);
        continue_button.position(width/2 - continue_button.size().width/2, height/2 - continue_button.size().height/2);
      }
    }
    // Check if this was the first selection in an attempt
    else if (current_trial === 1) testStartTime = millis();
  }
}


// Draw target on-screen
function drawTarget(i)
{
  // Get the location and size for target (i)
  let target = getTargetBounds(i);             
  noStroke();
  fill(color(155,155,155));
  // If this circle is the current target
  if(trials[current_trial] === i){
    if (trials[current_trial]===trials[current_trial+1]){
      noFill();
      strokeWeight(6);
      stroke(color(255, 255, 0));
      arc(target.x, target.y-target.w/2+5, target.w/2, target.w+target.w/2, -PI, 0);
    }
    else if (current_trial+1 < trials.length){
      stroke(color(155, 155, 155));
      strokeWeight(5);
      let next = getTargetBounds(trials[current_trial+1])
      line(target.x, target.y, next.x, next.y);
    } 
    if (dist(target.x, target.y, snap_target_x, snap_target_y) > target.w/2){
      stroke(color(0, 255, 0));
      strokeWeight(4); 
      fill(color(0, 100, 0));
    }
    else
    {
      stroke(color(255, 255, 255));
      strokeWeight(4); 
      fill(color(0, 255, 0));
    }
  }  
  else if (trials[current_trial+1] === i) {
    stroke(color(255, 0, 0));
    strokeWeight(6);
    fill(color(155, 155, 155));
  }
  else
    noStroke();
  circle(target.x, target.y, target.w);  

}


// Returns the location and size of a given target
function getTargetBounds(i)
{
  var x = parseInt(LEFT_PADDING) + parseInt((i % 3) * (TARGET_SIZE + TARGET_PADDING) + MARGIN);
  var y = parseInt(TOP_PADDING) + parseInt(Math.floor(i / 3) * (TARGET_SIZE + TARGET_PADDING) + MARGIN);

  return new Target(x, y, TARGET_SIZE);
}

// Evoked after the user starts its second (and last) attempt
function continueTest()
{
  // Re-randomize the trial order
  shuffle(trials, true);
  current_trial = 0;
  print("trial order: " + trials);
  
  // Resets performance variables
  hits = 0;
  misses = 0;
  fitts_IDs = [];
  
  continue_button.remove();
  
  // Shows the targets again
  draw_targets = true;
  testStartTime = millis();  
}

// Is invoked when the canvas is resized (e.g., when we go fullscreen)
function windowResized() 
{
  resizeCanvas(windowWidth, windowHeight);
    
  let display    = new Display({ diagonal: display_size }, window.screen);

  // DO NOT CHANGE THESE!
  PPI            = display.ppi;                        // calculates pixels per inch
  PPCM           = PPI / 2.54;                         // calculates pixels per cm
  TARGET_SIZE    = 1.5 * PPCM;                         // sets the target size in cm, i.e, 1.5cm
  TARGET_PADDING = 1.5 * PPCM;                         // sets the padding around the targets in cm
  MARGIN         = 1.5 * PPCM;                         // sets the margin around the targets in cm

  // Sets the margin of the grid of targets to the left of the canvas (DO NOT CHANGE!)
  LEFT_PADDING   = width/3 - TARGET_SIZE - 1.5 * TARGET_PADDING - 1.5 * MARGIN;        

  // Sets the margin of the grid of targets to the top of the canvas (DO NOT CHANGE!)
  TOP_PADDING    = height/2 - TARGET_SIZE - 3.5 * TARGET_PADDING - 1.5 * MARGIN;
  
  // Defines the user input area (DO NOT CHANGE!)
  inputArea      = {x: width/2 + 2 * TARGET_SIZE,
                    y: height/2,
                    w: width/3,
                    h: height/3
                   }

  // Starts drawing targets immediately after we go fullscreen
  draw_targets = true;
}

// Draws input area
function drawInputArea()
{
  noFill();
  stroke(color(220,220,220));
  strokeWeight(2);
  
  rect(inputArea.x, inputArea.y, inputArea.w, inputArea.h);
  
  for (let i = 0; i < 18; i++) {
    strokeWeight(1);
    stroke(color(0, 0, 0));
    let target = getTargetBounds(i);
    let x = map(target.x, 0, width, inputArea.x, inputArea.x + inputArea.w);
    let y = map(target.y, 0, height, inputArea.y, inputArea.y + inputArea.h);
    let size = ((TARGET_PADDING + TARGET_SIZE) / width) * inputArea.w;
    
    if(trials[current_trial] === i) {
      if(trials[current_trial] === trials[current_trial + 1]) {
        strokeWeight(4);
        stroke(color(255, 255, 0));
        size -= 4;
      } 
      if (dist(target.x, target.y, snap_target_x, snap_target_y) > target.w/2)
        fill(color(0, 200, 0));
      else{
        strokeWeight(4);
        stroke(color(255, 255, 255));
        fill(color(0, 255, 0));
        size -= 4;
      }
    }
    else if(trials[current_trial + 1] === i){
      strokeWeight(4);
      stroke(color(255, 0, 0));
      fill(color(220, 220, 220));
      size -= 4;
    }
    else 
      fill(color(155, 155, 155));
    square(x - size / 2, y - size / 2, size);
  }
}

function SnapTarget(x,y){
  let size = TARGET_PADDING + TARGET_SIZE;
  let t=-1;
  let distance = 1000000;
  let a = getTargetBounds(0);
  let b = getTargetBounds(17);
  for (var i = 0; i < 18; i++) {
    let tg = getTargetBounds(i);
    d = dist(x,y,tg.x, tg.y);
    if(d < distance && y>=a.y-(size/2) && x>=a.x-(size/2) && x<=b.x+ (size / 2) && y<=b.y+(size/2)){
      t = i;
      distance = d;
    }

  }
  return t;
}

function drawLabels() {

  textSize(50);
  noStroke();
  fill(color(255,255,255));
  text("Target identification:", width * 0.6, height * 0.10);

  let size = ((TARGET_PADDING + TARGET_SIZE) / width) *               inputArea.w;
  noStroke();
  fill(color("rgb(0,200,0)"));
  rect(width * 0.6, height * 0.18, size);

  noStroke();
  fill(color(255,255,255));
  textSize(30);
  text("Current target", width * 0.6 + TARGET_SIZE, height * 0.2 + TARGET_SIZE / 4);

  inputArea.w;
  strokeWeight(4);
  stroke(color(255, 0, 0));
  fill(color("rgb(220,220,220)"));
  rect(width * 0.6, height * 0.28, size);

  noStroke();
  fill(color(255,255,255));
  textSize(30);
  text("Next target", width * 0.6 + TARGET_SIZE, height * 0.3 + TARGET_SIZE / 4);

  inputArea.w;
  strokeWeight(4);
  stroke(color(255, 255, 0));
  fill(color("rgb(0, 200, 0)"));
  rect(width * 0.6, height * 0.38, size);

  noStroke();
  fill(color(255,255,255));
  textSize(30);
  text("Overlapping targets, click twice", width * 0.6 + TARGET_SIZE, height * 0.4 + TARGET_SIZE / 4);

  textSize(20);
  text("Tip: Use the input area's target map to achieve the best results ", width * 0.57, height * 0.87);

}
