module.exports = function(midiGrabber, looper){

  var repeater = {}

  var release = null
  var releaseTransform = null

  var downNotes = []
  var repeatLength = 1

  repeater.setLength = function(value){
    repeatLength = value
    refresh()
  }

  repeater.getRepeat = function(){
    if (release){
      return repeatLength
    }
  }

  repeater.start = function(length){
    if (!release){
      release = midiGrabber.grab(function(data){
        if (looper.params && looper.params.noRepeat && looper.params.noRepeat['144/' + data[1]]){
          return false
        } else if (data[2]){
          down(data)
        } else {
          return up(data)
        }
      })
    }
    if (length){
      repeater.setLength(length)
    }
  }

  repeater.stop = function(){
    if (release){
      release()
      release = null
    }
    downNotes = []
    refresh()
  }

  function down(data){
    downNotes.push(data)
    refresh()
  }

  function up(data){
    var filtered = false
    downNotes = downNotes.filter(function(note){
      if (note[0] == data[0] && note[1] == data[1]){
        filtered = true
      } else {
        return true
      }
    })
    refresh()
    return filtered
  }

  function refresh(){
    if (releaseTransform) {
      releaseTransform()
      releaseTransform = null
    }

    if (downNotes.length && repeatLength){
      releaseTransform = looper.transform('repeat', downNotes, repeatLength)
    }
  }

  return repeater
}