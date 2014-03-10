var Selector = require('./selector')

module.exports = function(sources, selectionColor){

  var selectorReleases = []
  var transformReleases = []
  var targetSelections = []
  var moveCount = 0

  var currentSource = null

  var selection = null
  var notes = null


  var sourceSuppressionRelease = null
  var selectionHighlightRelease = null

  function refreshSuppressOriginal(){
    if (moveCount > 0){
      if (!sourceSuppressionRelease && currentSource[1].transform && moveMode === 'move'){
        sourceSuppressionRelease = currentSource[1].transform('suppress', selection)
      }

      if (selectionHighlightRelease){
        selectionHighlightRelease()
        selectionHighlightRelease = null
      }
    } else{

      if (sourceSuppressionRelease){
        sourceSuppressionRelease()
        sourceSuppressionRelease = null
      }

      if (!selectionHighlightRelease){
        selectionHighlightRelease = setHighlight(currentSource[0], selection) 
      }
    } 
  }

  function releaseTransforms(){
    transformReleases.forEach(invoke)
    transformReleases = []
  }

  function releaseGrabs(){
    selectorReleases.forEach(invoke)
    selectorReleases = []
  }

  function setHighlight(source, notes){
    var releases = []
    if (source.controlType == 'button'){
      releases.push(source.light(selectionColor))
    } else if (source.getButton) {
      notes.forEach(function(note){
        var button = source.getButton(note)
        if (button){
          releases.push(button.light(selectionColor))
        }
      })
    }
    return function(){
      releases && releases.forEach(invoke)
      releases = null
    }
  }

  function beginMove(){
    refreshSuppressOriginal()
    releaseGrabs()

    notes = currentSource[1].getNotes(selection)

    sources.forEach(function(source){

      var releases = {}

      selectorReleases.push(source[0].grab(function down(data){
        moveCount += 1
        refreshSuppressOriginal()

        if (source[0].controlType == 'button'){
          releases[data[1]] = transform(source)
        } else if (data[2]) {
          releases[data[1]] = transform(source, data)
        }

      }, function up(data){
        moveCount -= 1
        refreshSuppressOriginal()

        if (releases[data[1]]){
          releases[data[1]]()
          releases[data[1]] = null
        }

      }))
    })
  }

  function transform(target, offsetNote){
    var offset = getOffset(selection, offsetNote)

    var newNotes = getOffsetNotes(notes, offset)
    var suppression = getOffsetNotes(selection, offset)

    targetSelections.push(suppression)

    var releaseHighlight = setHighlight(target[0], suppression)
    transformReleases.push(releaseHighlight)

    if (target[1].transform){
      var releaseSuppression = target[1].transform('suppress', suppression)
      var releaseNotes = target[1].transform('notes', newNotes)
      transformReleases.push(releaseSuppression)
      transformReleases.push(releaseNotes)
    } else if (target[1].setNotes && target[1].setFilter){
      target[1].setFilter(suppression)
      target[1].setNotes(newNotes)
    }

    return function(){
      if (releaseSuppression && releaseNotes){
        releaseSuppression()
        releaseNotes()
        releaseSuppression = releaseNotes = null
        removeFrom(releaseSuppression, transformReleases)
        removeFrom(releaseNotes, transformReleases)
      }

      removeFrom(suppression, targetSelections)

      if (releaseHighlight){
        removeFrom(releaseHighlight, transformReleases)
        releaseHighlight()
      }

    }

  }

  return {
    getTargetSelection: function(){
      if (targetSelections.length){
        return Array.prototype.concat.apply([], targetSelections)
      }
    },
    getSelection: function(){
      return selection
    },
    start: function(mode){

      this.clear()

      moveMode = mode || 'move'
      moveCount = 0

      sources.forEach(function(source){
        if (source[0].controlType == 'button'){

          selectorReleases.push(source[0].grab(function(){
            currentSource = source

            if (source[1].getFilter){
              selection = source[1].getFilter()
            }

          }))

        } else if (source[0].controlType == 'noteMatrix'){
          
          var selector = Selector(source[0], selectionColor, function(state){
  
            if (state == 'selected'){
              currentSource = source
              selection = selector.selection
            }

          })

          selector.start()
          selectorReleases.push(selector.stop)
        }
      })

    },


    beginMove: function(){
      releaseGrabs()

      if (currentSource){
        beginMove()
        return true
      }
    },

    clear: function(){
      releaseGrabs()
      releaseTransforms()

      if (selectionHighlightRelease){
        selectionHighlightRelease()
        selectionHighlightRelease = null
      }

      if (sourceSuppressionRelease){
        sourceSuppressionRelease()
        sourceSuppressionRelease = null
      }

      selection = null
      targetSelections = []
      currentSource = null
      mode = null
    }

  }
}

function getOffsetNotes(notes, offset){
  if (notes && offset){
    return notes.map(function(note){
      if (Array.isArray(note)){
        var newNote = note.concat()
        newNote[1] = newNote[1] + offset
        return newNote
      } else {
        var parts = note.split('/')
        return parts[0] + '/' + (parseInt(parts[1]) + offset)
      }
    })
  } else {
    return notes
  }
}

function invoke(func){
  func()
}


function getOffset(notes, target){



  if (notes && notes.length && target){

    if (Array.isArray(target)){
      target = target[1]
    } else {
      target = parseInt(target.split('/')[1])
    }

    var start = notes.map(function(note){
      if (Array.isArray(note)){
        return note[1]
      } else {
        return parseInt(note.split('/')[1])
      }
    }).sort(function(a,b){return a - b})[0]

    return target - start
  } else {
    return 0
  }
}

function removeFrom(item, from){
  var index = from.indexOf(item)
  if (~index){
    from.splice(index, 1)
  }
}