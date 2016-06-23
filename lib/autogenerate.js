placeNames = ["art gallery",
"atm",
"automat",
"bank",
"barracks",
"bike workshop",
"boarding school",
"bungalow",
"bus stop",
"camper",
"car dealership",
"casino",
"checkpoint",
"chef restaurant",
"church",
"cocktail bar",
"community garden",
"control room",
"crematorium",
"drawbridge",
"drive-through restaurant",
"factory",
"family-run restaurant",
"farm",
"fast food restaurant",
"fire station",
"five-star hotel",
"flagship store",
"flea market",
"garbage facility",
"gas station",
"greenhouse",
"gym",
"hairdresser",
"hospital",
"internet café",
"kibbutz",
"kindergarden",
"laboratory",
"library",
"lotto toto",
"love hotel",
"marina",
"market",
"mom and pop shop",
"monastery",
"mosque",
"museum",
"open plan office",
"parking garage",
"penthouse",
"pharmacy",
"playground",
"police station",
"power plant",
"public park",
"school",
"self storage",
"shooting range",
"soup kitchen",
"spiritual center",
"supermarket",
"synagogue",
"tanning salon",
"temple",
"terminal",
"villa",
"war monument",
"warehouse",
"watchtower",
"windmill",
"youth hostel"]

placeDescriptions = ['Showroom for something else.',
'a place for lines to form when the economy collapses.',
'a machine with or without free will that provides goods or services.',
'a counter, a safe full of cash and gold, humorless men in suits, increasingly: facade to global data streams',
'modular housing units for soldiers, after the end of military operations sometimes repurposed for civilian needs.',
'a professional surgery for pedal-driven vehicles and amateur philosophy seminar.',
'bringing the detachment of education from reality to its logical extreme by allowing pupils to sleep on the premises.',
'originally referring to a single-story house in the style of the Bengal region, now referring to pretty much anything.',
'a sign, a timetable, a roof, a bench, an advertisement: the iconic place of public transit and common infrastructure.',
'home away from home, on wheels.',
'where you can encounter car dealers and at least a million balloons.',
'once playgrounds of the reckless rich, now black holes in the gravitational landscape of everyone\'s dreams.',
'where a flow is broken down into particles in order to exercise control.',
'from a back-stage kitchen, food is served as spectacle to guest in costumes.',
'a space designed for Christian religious activities, typically includes a tower with a bell.',
'a spatial structure allowing for alcoholic drinks to be elaboratively mixed on one side and consumed on the other.',
'an infrastructure for urbanites interested in sharing the experience of growing plants; sometimes used for actual agriculture.',
'a room with screens where long stretches of boredom alternate with split-second decisions under pressure.',
'a facility to reduce human bodies to ashes, which may then be buried, kept at home or scattered by the wind over the sea.',
'a bridge you can lift up to let ships pass, keep out enemies or show a penis to the Russian secret service.',
'roadside infrastructure allowing for the simultaneous comsumption of fuel and fast food, pioneered in the 1930s.',
'the central idea of the industrial revolution: Machines and workers form a unit.',
'providing the comfort of a stable identity and sometimes a front for shadier business in the back.',
'open fields and structures used by farmers to grow plants and raise animals; increasingly: factories for biomass.',
'the optimiziation of all features created a remarkably accessible food comsumption space: thank you for your cooperation.',
'built around the iconic pole allowing firefighters to descend quickly from living quarters to the rescue vehicles.',
'includes features like a spacious reception hall or \"turndown\" service, where staff prepare the bed for sleeping.',
'a place of brand worship, often brightly lit and sparkling to maximize attraction.',
'where old magically becomes new.',
'deals with your trash.',
'since 1905, a roof you can drive your car under for a refill.',
'a transparent structure that catches sunlight and allows plants to grow, sometimes used as a metaphor for our entire planet.',
'centralised infrastructure for the sculpting of bodies.',
'a site for the construction, maintenance and demolition of ultralight architecture.',
'many rooms full of specialized equipment to treat the sick: beds on wheels, life support systems, operation rooms.',
'full service hub providing communication equipment and sugar for immigrant and online gamer communities.',
'en ensemble of buildings and structures to serve the needs of an independent, utopian community.',
'the architecture of childhood: the 19th century idea of letting kids play in a secure environment to train for the adult world.',
'a controlled setting for experiments; increasingly abbreviated as \"lab\" to dignify very important creative ogranizations',
'a walk-in data center for curious humans; creative outlet for ambitious architects.',
'a kiosk where you can buy newspapers, cigarettes, play the lottery and bet on German soccer results.',
'enjoy a private room for two in a castle, boat or UFO, and settle the bill anonymously!',
'a dock for pleasure boats and setting for fancy seafood restaurants.',
'stable infrastructure for the fluid dynamics of buying and selling: stands, lanes, sometimes a directory, possibly a roof.',
'rather than a place to buy new parents, a small store where you encounter the people running the business.',
'a more or less secluded place for people bound by vows to a religious life.',
'a space designed for Islamic religious activities, typically includes a spire from which calls to prayer are performed.',
'an ensemble of exhibitions, cloak rooms, shops and cafés; some with inexhaustible magnetism, some forever in obscurity.',
'a grid of cublices or laptop landscape.',
'a multi-story structure to make the modern avalance of cars manageable.',
'a luxury dwelling on the roof of another building, obligatory for a true \"life on top\" attitude.',
'trade money for legal drugs and medicine; get gossip for free.',
'where the anarchic generativity of play is encouraged, shaped and watched over.',
'you local neighborhood law enforcement outpost, typically includes offices, locker rooms, interrogation rooms, holding cells.',
'an ominous black box at the edge of town that keeps your TV running.',
'an open space with grass and trees to provide relief from dense urban surroundings.',
'a remarkably stable ensemble including classrooms, a yard, and the principal\'s office.',
'a nondescript, compartmentalized building for the containment of sentimental value.',
'organized in lanes, people are enabled to safely fire guns at silhouettes of other people, animals or abstract circles.',
'free hot food for the hungry; photo opportunity for campaigning politicians.',
'architecture with lofty goals.',
'the early 20th century idea that customers can walk up to a shelf and pick what they want started a revolution.',
'a space designed for Jewish religious activities, typically includes a cabinet for sacred texts.',
'where white people expose themselves to ultraviolet radiation in an effort to make their skin look darker.',
'a space designed for Hindu, Buddhist or other sprititual activities.',
'an expensive shopping mall in which you wait before boarding a transport vehicle.',
'an upper-class residential unit designed in a way to express the owner\'s personality.',
'celebrating the glory of victory – or commemorating the dead, injured and traumatised.',
'where our packages come from.',
'\"There must be some way out of here, said the joker to the thief.\"',
'an iconic landmark and pioneering method of harvesting energy out of thin air.',
'What was started in 1912 to aid German youth is now global infrastructure for \"backpackers\" of all ages.']

connections = [
  {name: "road", action: "walk down"},
  {name: "path", action: "walk along"},
  {name: "line on the ground", action: "follow"},
  {name: "staircase", action: "take"},
  {name: "ladder", action: "climb up"},
  {name: "highway", action: "walk along"},
  {name: "subway", action: "take"},
  {name: "escelator", action: "get on"},
  {name: "elevator", action: "get on"},
  {name: "blimp", action: "take"},
  {name: "shortcut", action: "use"},
  {name: "tunnel", action: "follow"},
  {name: "bus", action: "take"},
]

autogenerateRoom = function(callback) {

  // select a place name
  var placeIndex = null
  var counter = 0
  var maxTries = 100
  do {
    placeIndex = Math.floor(Math.random() * placeNames.length)
    counter++  
  } while(Rooms.findOne({slug: slugify(placeNames[placeIndex])}) && counter < maxTries);
  if(counter >= maxTries) {
    return null
  }
    
  var placeName = placeNames[placeIndex]
  var placeDescription = "You are at the " + placeName + ": " + placeDescriptions[placeIndex] + " "
  
  var moveActionsDescription = ""
  var moveActionsCode = ""
  var destinations = Rooms.find({"visibility": {$in: ["unlisted", "public"]}}).fetch()
  var numMoves = Math.floor(Math.random() * 2) + 1
  for(var i = 0; i < numMoves; i++) {
    var connection = connections[Math.floor(Math.random() * connections.length)]
    var destination = destinations[Math.floor(Math.random() * destinations.length)]
    if(connection && destination) {
      if(!moveActionsDescription) {
        placeDescription += "<br><br>There is "
      }
      placeDescription += `a ${connection.name} to the ${destination.name}`
      if(i < numMoves - 2 && numMoves > 2) {
        placeDescription += ", "
      }
      if(i == numMoves - 2 && numMoves > 1) {
        placeDescription += " and "
      }
      if(i == numMoves - 1) {
        placeDescription += "."
      }      
      moveActionsDescription += `<b>${connection.action} the ${connection.name}</b> `
      moveActionsCode += `if(input.contains("${connection.action}", "${connection.name}", "${destination.name}")) {
          output("You ${connection.action} the ${connection.name} to the ${destination.name}...")
          player.moveTo("${destination.name}")
}   
`;
    }
  }

  var justArrivedCode = `if(player.justArrived) { 
      output("${placeDescription}")
      output("${moveActionsDescription}")
}
`;
  var script = justArrivedCode + moveActionsCode

  var object = {
    name: placeName,
    slug: slugify(placeName),
    script: script,
    exits: findExits(script),
    css: "",
    visibility: "public",
    editUUID: generateUUID(),
    playUUID: generateUUID(),
    editors: [Meteor.userId()]
  }
  
  
  return Rooms.insert(object)
  
}