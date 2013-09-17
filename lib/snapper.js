module.exports = function(noteMatrix, looper){

  var notes = []
  var filter = []

  var releaseSuppression = null
  var releaseNotes = null

  var playing = true

  function refresh(){
    if (releaseSuppression){
      releaseSuppression()
      releaseSuppression = null
    }

    if (releaseNotes){
      releaseNotes()
      releaseNotes = null
    }

    if (playing){
      releaseSuppression = looper.transform('suppress', filter)
      releaseNotes = looper.transform('notes', notes)
    }
  }

  return {

    targetType: 'snapshot',

    play: function(){
      playing = true
      refresh()
    },

    stop: function(){
      playing = false
      refresh()
    },

    getNotes: function(){
      return notes
    },
    getFilter: function(){
      return filter
    },
    setNotes: function(value){
      notes = value
      refresh()
    },
    setFilter: function(value){
      filter = value
      refresh()
    }

  }
}