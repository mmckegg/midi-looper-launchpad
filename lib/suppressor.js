var Selector = require('./selector')

var getNotesInside = require('./get_notes_inside')

module.exports = function(matrix, looper, selectionColor){

  var releaseTransform = null
  var selector = {
    start: function(){
      releaseTransform = looper.transform('suppress')

    },
    stop: function(){
      if (releaseTransform) {
        releaseTransform()
        releaseTransform = null
      }
    }
  } //Selector(matrix, selectionColor, refresh)

  return selector
}