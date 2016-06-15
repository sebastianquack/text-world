input = {}
room = {}
player = {}

// executes the given roomScript and handles the result
var processInput = function(roomScript, _input, _room, _player, callback) {
  
    // set globals so that eval can see them
    input = _input
    room = _room
    player = _player
  
    var result = {
        error: null
    };

    try {
      eval(roomScript)
      //result.output = stringify(runHidden(roomScript));
    } catch(e) {
      result.error = e.message;
    }

    //application.remote.output(result);
    callback(result)
}


// protects even the worker scope from being accessed
var runHidden = function(code) {
    var indexedDB = null;
    var location = null;
    var navigator = null;
    var onerror = null;
    var onmessage = null;
    var performance = null;
    var self = null;
    var webkitIndexedDB = null;
    var postMessage = null;
    var close = null;
    var openDatabase = null;
    var openDatabaseSync = null;
    var webkitRequestFileSystem = null;
    var webkitRequestFileSystemSync = null;
    var webkitResolveLocalFileSystemSyncURL = null;
    var webkitResolveLocalFileSystemURL = null;
    var addEventListener = null;
    var dispatchEvent = null;
    var removeEventListener = null;
    var dump = null;
    var onoffline = null;
    var ononline = null;
    var importScripts = null;
    var console = null;
    //var application = null;
    
    return eval(code);
}


// converts the output into a string
var stringify = function(output) {
    var result;

    if (typeof output == 'undefined') {
        result = 'undefined';
    } else if (output === null) {
        result = 'null';
    } else {
        result = JSON.stringify(output) || output.toString();
    }

    return result;
}

application.setInterface({processInput:processInput});

// functionality included directly into (and only in) the plugin
String.prototype.in = function(array) {
  return (array.indexOf(this.toString()) > -1)
}

String.prototype.similar = function(text, limit = 80) {
  return similar(this.toString(), text, limit)
}

var similar = function(string1, string2, limit = 80) {
  return similar_text(string1, string2, true) >= limit
}

var similar_text = function(first, second, percent) { // eslint-disable-line camelcase
  //  discuss at: http://locutus.io/php/similar_text/
  // original by: Rafał Kukawski (http://blog.kukawski.pl)
  // bugfixed by: Chris McMacken
  // bugfixed by: Jarkko Rantavuori original by findings in stackoverflow (http://stackoverflow.com/questions/14136349/how-does-similar-text-work)
  // improved by: Markus Padourek (taken from http://www.kevinhq.com/2012/06/php-similartext-function-in-javascript_16.html)
  //   example 1: similar_text('Hello World!', 'Hello locutus!')
  //   returns 1: 8
  //   example 2: similar_text('Hello World!', null)
  //   returns 2: 0

  if (first === null ||
    second === null ||
    typeof first === 'undefined' ||
    typeof second === 'undefined') {
    return 0
  }

  first += ''
  second += ''

  var pos1 = 0
  var pos2 = 0
  var max = 0
  var firstLength = first.length
  var secondLength = second.length
  var p
  var q
  var l
  var sum

  for (p = 0; p < firstLength; p++) {
    for (q = 0; q < secondLength; q++) {
      for (l = 0; (p + l < firstLength) && (q + l < secondLength) && (first.charAt(p + l) === second.charAt(q + l)); l++) { // eslint-disable-line max-len
        // @todo: ^-- break up this crazy for loop and put the logic in its body
      }
      if (l > max) {
        max = l
        pos1 = p
        pos2 = q
      }
    }
  }

  sum = max

  if (sum) {
    if (pos1 && pos2) {
      sum += similar_text(first.substr(0, pos1), second.substr(0, pos2))
    }

    if ((pos1 + max < firstLength) && (pos2 + max < secondLength)) {
      sum += similar_text(
        first.substr(pos1 + max, firstLength - pos1 - max),
        second.substr(pos2 + max,
        secondLength - pos2 - max))
    }
  }

  if (!percent) {
    return sum
  }

  return (sum * 200) / (firstLength + secondLength)
}
