module.exports = function(looper){
  var release = null

  var holding = false
  var length = 2
  var position = null

  function refresh(){
    if (holding){
      release&&release()
      var loopLength = looper.getInput().length
      var start = position % loopLength
      release = looper.transform('hold', start, length)
    } else if (release) {
      release()
      release = null
    }
  }

  return {
    getLength: function(){
      return length
    },
    setLength: function(value){
      if (length !== value){
        length = value
        refresh()
      }
    },
    start: function(){
      if (!holding){
        position = looper.getPosition()
        holding = true
        refresh()
      }
    },
    stop: function(){
      if (holding){
        holding = false
        refresh()
      }
    }
  }
}