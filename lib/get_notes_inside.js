module.exports = function(startKey, endKey){

  var result = []

  var start = getCoords(startKey)
  var end = getCoords(endKey)

  var startRow = Math.min(start[1], end[1])
  var startColumn = Math.min(start[0], end[0])
  
  var endRow = Math.max(start[1], end[1])
  var endColumn = Math.max(start[0], end[0])

  for (var r=startRow;r<endRow+1;r++){

    var y = r
    if (start[1] > end[1]){
      y = endRow - (r - startRow)
    }
    
    for (var i=startColumn;i<endColumn+1;i++){

      var x = i
      if (start[0] > end[0]){
        x = endColumn - (i - startColumn)
      }

      if ((y!=start[1] || x!=start[0]) && (y!=end[1] || x!=end[0])){
        var note = noteFromCoords([x,y])
        if (note){
          result.push(note)
        }
      }
    }

  }

  return result
}

var coords = {}
var notes = {}
var offset = 0

for (var y=0;y<8;y++){
  for (var x=0;x<8;x++){
    var note = [144, offset++]
    notes[x + ',' + y] = note
    coords[note[0] + '/' + note[1]] = [x,y]
  }
}

function noteFromCoords(targetCoords){
  return notes[targetCoords.join(',')]
}

function getCoords(targetKey){
  return coords[targetKey]
}

function eq(a, b){
  return a[0] == b[0] && a[1] == b[1]
}