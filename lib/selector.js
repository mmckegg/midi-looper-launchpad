var getNotesInside = require('./get_notes_inside')

module.exports = function(matrix, selectionColor, cb){

  var selector = {
    selection: [],
    start: function(){
      if (!release){
        release = matrix.grab(function(data){
          if (data[2]) down(data)
          else up(data)
        })
      }
    },
    stop: function(){
      if (release){
        release()
        release = null
      }
      selector.selection = []
      releaseSelection.forEach(function(r){r()})
      releaseSelection = []
      cb&&cb('clear')
    }
  }

  var release = null
  var releaseTransform = null

  var releaseSelection = []

  var rootSelection = null
  var downCount = 0

  function down(data){
    var key = data[0] + '/' + data[1]

    downCount += 1
    select(data)

    if (rootSelection === null){
      rootSelection = key
    } else {
      getNotesInside(rootSelection, key).forEach(select)
    }

    cb&&cb()
  }

  function up(data){
    downCount -= 1
    if (rootSelection === data[0] + '/' + data[1]){
      rootSelection = null
    }

    if (downCount == 0){
      cb('selected')
    }
  }

  function select(data){
    var key = data[0] + '/' + data[1]
    if (!~selector.selection.indexOf(key)){
      selector.selection.push(key)
      var button = matrix.getButton(data)
      if (button){
        releaseSelection.push(button.light(selectionColor))
      }
    }
  }


  return selector
}