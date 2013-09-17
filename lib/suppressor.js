var Selector = require('./selector')

var getNotesInside = require('./get_notes_inside')

module.exports = function(matrix, looper, selectionColor){

  var selector = Selector(matrix, selectionColor, refresh)
  var releaseTransform = null

  function refresh(){
    if (releaseTransform) {
      releaseTransform()
      releaseTransform = null
    }

    if (selector.selection.length){
      releaseTransform = looper.transform('suppress', selector.selection)
    }
  }

  return selector
}