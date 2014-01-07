var Selector = require('./selector')

module.exports = function(sources, selectionColor){

  var highlightReleases = []
  var selectorReleases = []
  var moveReleases = []
  var currentSelection = null

  var currentSource = null

  var selection = null
  var notes = null


  var sourceSuppressionRelease = null


  function releaseMove(){
    moveReleases.forEach(invoke)
    moveReleases = []
  }

  function releaseGrabs(){
    selectorReleases.forEach(invoke)
    selectorReleases = []
  }

  function releaseHighlight(){
    highlightReleases.forEach(invoke)
    highlightReleases = []
  }

  function setHighlight(source, notes){
    if (source.controlType == 'button'){
      highlightReleases.push(source.light(selectionColor))
    } else if (source.getButton) {
      notes.forEach(function(note){
        var button = source.getButton(note)
        if (button){
          highlightReleases.push(button.light(selectionColor))
        }
      })
    }
  }

  function beginMove(){
    releaseGrabs()
    setHighlight(currentSource[0], selection)

    notes = currentSource[1].getNotes(selection)

    sources.forEach(function(source){
      selectorReleases.push(source[0].grab(function(data){
        
        if (source[0].controlType == 'button'){
          transform(source)
        } else if (data[2]) {
          transform(source, data)
        }
      }))
    })
  }

  function suppressOriginal(){
    if (!sourceSuppressionRelease && currentSource[1].transform){
      if (selection){
        sourceSuppressionRelease = currentSource[1].transform('suppress', selection)
      } else {
        sourceSuppressionRelease = currentSource[1].transform('clear')
      }
    }
  }

  function transform(target, offsetNote){
    if (moveMode === 'move'){
      releaseMove()
      suppressOriginal()
    }

    var offset = getOffset(selection, offsetNote)

    var newNotes = getOffsetNotes(notes, offset)
    var suppression = getOffsetNotes(selection, offset)

    currentSelection = suppression

    releaseHighlight()
    setHighlight(target[0], suppression)


    if (target[1].transform){
      moveReleases.push(target[1].transform('suppress', suppression))
      moveReleases.push(target[1].transform('notes', newNotes))
    } else if (target[1].setNotes && target[1].setFilter){
      target[1].setFilter(suppression)
      target[1].setNotes(newNotes)
    }
  }

  return {
    getTargetSelection: function(){
      return currentSelection
    },
    getSelection: function(){
      return selection
    },
    start: function(mode){

      moveMode = mode || 'move'

      sources.forEach(function(source){
        if (source[0].controlType == 'button'){

          selectorReleases.push(source[0].grab(function(){
            currentSource = source

            if (source[1].getFilter){
              selection = source[1].getFilter()
            }

            beginMove()
          }))

        } else if (source[0].controlType == 'noteMatrix'){
          
          var selector = Selector(source[0], selectionColor, function(state){
  
            if (state == 'selected'){
              currentSource = source
              selection = selector.selection
              beginMove()
            }

          })

          selector.start()
          selectorReleases.push(selector.stop)
        }
      })

    },
    stop: function(){
      releaseGrabs()
      releaseHighlight()
      releaseMove()

      if (sourceSuppressionRelease){
        sourceSuppressionRelease()
        sourceSuppressionRelease = null
      }

      selection = null
      currentSelection = null
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