window.Bot = function(bot){
  var self = this;
  // if it was given in the constructor, use it
  self._bot = bot || $("#bot");
  self.current = {
    x:0,
    y:0,
    z:"NORTH"
  }
  self.isPlaced = false;

  self.bearings = function(){

    switch(self.current.z){
      case "NORTH":
        return {LEFT: "WEST", RIGHT:"EAST", MOVE: "y", BY:1};
      case "SOUTH":
        return {LEFT: "EAST", RIGHT:"WEST", MOVE: "y", BY:-1};
      case "EAST":
        return {LEFT: "NORTH", RIGHT:"SOUTH", MOVE: "x", BY:1};
      case "WEST":
        return {LEFT: "SOUTH", RIGHT:"NORTH", MOVE: "x", BY:-1};
    }
  }
  self.updateLast = function(params){
    params = params || {}
    if(!isNaN(params.x)){
      self.current.x = params.x;
    }
    if(!isNaN(params.y)){
      self.current.y = params.y;
    }
    if(["NORTH", "SOUTH", "WEST", "EAST"].indexOf(params.z) >= 0){
      self.current.z = params.z;
    }
    console.log("UPDATED", self.current)
    return self;
  }

  // simple method to return a translated coordinate to units
  self.coordinates = function(position){
    var factor = 8, ret;

    position = position === 0 ? position : position + 1;

    if(position === 1){
        return factor + "vw"
    }

    if(position > 1 && position <=5){
      return position * factor - factor + "vw"
    }
    // all else, including 0 will default to southwest
    return 0;
  }

  // change direction
  self.go = function(params){
    params = params || {};

    var x = self.coordinates(params.x);
    var y = self.coordinates(params.y);

    self._bot.css({
        "left": x,
        "bottom": y
    });
  }

  // move along the grid
  self.turn = function(params){
    params = params || {}
    var degree = 0;

    console.log("IN TURN", params)

    if(typeof params.z !== "string"){
      return;
    }

    switch(params.z){
      case "SOUTH":
        degree = 180;
        break;
      case "EAST":
        degree = 90;
        break;
      case "WEST":
        degree = 270;
        break;
      case "NORTH":
      default:
        degree = 0;
        break;      
    }

    //turn first, then move .5s later. Just looks cooler
    return self._bot.css({
      "-webkit-transform": "rotate("+(degree)+"deg)", /* Ch <36, Saf 5.1+, iOS, An =<4.4.4 */
      "-ms-transform": "rotate("+(degree)+"deg)", /* IE 9 */
      "transform": "rotate("+(degree)+"deg)" /* IE 10, Fx 16+, Op 12.1+ */
    });
  }

  self.PLACE = function(params){
    params = params || {};
    self
      .updateLast(params)
      .turn(params);
    return setTimeout(function(){
      self.go(params);
      self.isPlaced = true;
    }, 500);
  };

  self.MOVE = function(){
    var b = self.bearings();
    var axis = self.current[b.MOVE];
    var otherAxis = b.MOVE === "y" ? "x" : "y";
    var nextMove = axis + b.BY;
    var update = {}
    if(nextMove < 0 || nextMove > 4){
      return "I can't move there :(";
    }



    update[b.MOVE] = nextMove;
    update[otherAxis] = self.current[otherAxis];

    console.log("IN MOVE", update)

    return self.updateLast(update).go(update);

  }

  self.LEFT = function(){
    var b = self.bearings(), params = {
      z: b.LEFT
    };
    return self.updateLast(params).turn(params);
  }

  self.RIGHT = function(){
    var b = self.bearings(), params = {
      z: b.RIGHT
    };
    return self.updateLast(params).turn(params);
  }
  self.REPORT = function(){
    var message = "My current X position is: " + self.current.x + ". \n";
    message += "My current Y position is: " + self.current.y + ". \n";
    message += "My current F position is: " + self.current.z + ". \n";
    return window.alert(message)
  }
}

$(document).ready(function(){
  var bot = new Bot;
  var form = $("#command")
  var errorElement = $("#error");
  var errorContent = errorElement.find("p")
  var reportElement = $("#report");
  var place_command = ["PLACE"];
  var single_commands = ["MOVE", "LEFT", "RIGHT", "REPORT"];
  var valid_commands = place_command.concat(single_commands);
  var valid_facings = ["NORTH", "SOUTH", "WEST", "EAST"];

  var toggleError = function(message){
    errorContent.empty().html(message);
    errorElement.css({opacity:1});
    setTimeout(function(){
      errorElement.css({opacity:0});
    }, 1e4)
  }

  var validate_input = function(input){
    if(typeof input !== "string"){
      return toggleError("Type a command!");
    }

    input = input.toUpperCase().trim();

    var iArray = input.split(" ").map(function(i){
      return i.trim();
    });

    if(iArray.length === 1){
      if(!bot.isPlaced){
        return toggleError("We have to begin with a valid place command...");;
      }
      // single command
      if(single_commands.indexOf(iArray[0]) < 0){
        return toggleError("Commands that don't need coordinates are: <br>" + single_commands.join(" | "));
      }

      var ret = bot[iArray[0]]();
      if(typeof ret === 'string'){
          return toggleError(ret);;
      }
      
    }

    // no reason to be absolutely anal and disallow spaces between commas :)
    if(iArray.length >= 2 && iArray[0].toUpperCase() === "PLACE"){
      // but definitely at just 2 commas!
      if(input.split(",").length-1 < 2){
        return toggleError("Place commands are in the following format: <br>PLACE X,Y,F");
      }
      var coords = input.replace("PLACE", "").trim().split(",").map(function(i){
        return i.trim();
      });

      // okay, we need the length to be exactly 3 here!
      if(coords.length !== 3){
        return toggleError("Place commands are in the following format: <br>PLACE X,Y,F");
      }
      var x = +coords[0], y = +coords[1], z = coords[2]

      // x has to be a number between 0 and 4;
      if(isNaN(x) || x < 0 || x > 4){
        return toggleError("The 'X' in PLACE X,Y,F must be a number from 0 to 4");
      }

      // y has to be a number between 0 and 4;
      if(isNaN(y) || y < 0 || y > 4){
         return toggleError("The 'Y' in PLACE X,Y,F must be a number from 0 to 4");
      } 

      if(valid_facings.indexOf(z) < 0){
        return toggleError("The 'F' in PLACE X,Y,F must be either NORTH, SOUTH, EAST or WEST");
      }

      return bot.PLACE({x:x,y:y,z:z});

    }

  }
  form
    .find("input")
    .on("blur", function(e){
      e.currentTarget.select();
    })
    .on("focus", function(e){
      e.currentTarget.select();
    })

  form.on("submit", function(e){
    e.preventDefault();
    var val = form.find("input").val();
    console.log(val);
    if(!val){
      return toggleError("Valid commands are:<br> " + valid_commands.join(" | "));
    }
    return validate_input(val);
  })


});