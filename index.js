var Through = require('through')
var Controller = require('midi-controller')

var Mover = require('./lib/mover')
var Repeater = require('./lib/repeater')
var Suppressor = require('./lib/suppressor')
var Snapper = require('./lib/snapper')
var Holder = require('./lib/holder')
var Transformer = require('./lib/transformer')

var stateLights = require('./lib/state_lights')

module.exports = function(duplexPort, looper){

  // clear lights
  duplexPort.write([176, 0, 0])

  var repeatStates = [1, 2/3, 1/2, 1/3, 1/4, 1/6, 1/8]
  var recordingNotes = []
  var activeNotes = {}
  var currentPosition = 0
  var isSelecting = false

  var offset = 0
  
  var control = Through(function(schedule){

    var to = schedule.to + offset
    var from = schedule.from + offset

    // bopper data
    var repeatLength = holder.getLength()
    var currentRepeat = Math.floor(to / repeatLength) * repeatLength

    var step = looper.getLength() / 8
    var currentBeat = Math.floor(to / step) * step

    if (currentBeat > from && currentBeat <= to){
      setDisplayPosition(currentBeat / step % 8)
    }

    if (currentRepeat > from && currentRepeat <= to){
      holdButton.flash(stateLights.green, 20)
    }

    var position = to - looper.getLength()
    var currentNotes = recordingNotes
    currentPosition = to
    recordingNotes = looper.recorder.getActiveNotes(position, looper.getLength())
    diff(recordingNotes, currentNotes).forEach(refreshButtonState)
    diff(currentNotes, recordingNotes).forEach(refreshButtonState)
    refreshLearnButton()
  })

  control.setOffset = function(value){
    value = parseFloat(value) || 0
    if (offset !== value){
      offset = value
      control.emit('offset', value)
    }
  }

  control.getOffset = function(){
    return offset
  }

  var controller = Controller(duplexPort)

  // wire up buttonMatrix
  var noteMatrix = controller.createNoteMatrix(generateNoteGrid(144, 0), stateLights.amber)
  var transformer = Transformer(noteMatrix, looper, stateLights.red)

  looper.recorder.pipe(noteMatrix).on('data', function(data){
    control.queue(data)
  })

  control.noteMatrix = noteMatrix
  control.stateLights = stateLights

  looper.on('noteState', function(note, state){
    var key = note[0] + '/' + note[1]
    activeNotes[key] = state === 'active'
    refreshButtonState(key)
  })

  function refreshButtonState(key){
    var button = noteMatrix.getButton(key)
    if (button){
      if (activeNotes[key]){
        button.setOff(stateLights.greenLow)
      } else if (~recordingNotes.indexOf(key)){
        button.setOff(stateLights.redLow)
      } else {
        button.setOff(stateLights.off)
      }
    }
  }

  var learnMode = 'store'
  function refreshLearnButton(){
    if (looper.getTransformCount()){
      learnButton.setOff(stateLights.greenLow)
      learnMode = 'bounce'
    } else {
      if (recordingNotes.length > 0){
        learnButton.setOff(stateLights.redLow)
      } else {
        learnButton.setOff(stateLights.off)
      }
      learnMode = 'store'
    }
  }

  // transform
  var suppressor = Suppressor(noteMatrix, looper, stateLights.red)
  var repeater = Repeater(noteMatrix, looper)
  var snapper1 = Snapper(noteMatrix, looper)
  var snapper2 = Snapper(noteMatrix, looper)
  var holder = Holder(looper)


  var snap1Button = controller.createButton([176, 109], function(){
    this.turnOn(stateLights.yellow)
    snapper1.play()
  }, function(){
    this.turnOff()
    snapper1.stop()
  })
  var snap2Button = controller.createButton([176, 110], function(){
    this.turnOn(stateLights.yellow)
    snapper2.play()
  }, function(){
    this.turnOff()
    snapper2.stop()
  })



  var learnButton = controller.createButton([176, 104], function(){
    this.flash(stateLights.green)
    if (learnMode === 'bounce'){
      looper.bounce()
    } else if (learnMode === 'quantize'){
      //TODO: not currently used
      var grid = repeater.getRepeat() || 1/4
      looper.transform('quantize', grid, mover.getSelection())
      looper.bounce()
    } else {
      looper.store(null, 0.01)
    }

    mover.clear()
    endMove()
  })

  var releaseShift = []
  var releaseMove = []
  var releaseSuppress = []

  var lastMovePress = 0

  var moveButton = controller.createButton([176, 111], function(){
    endMove()
    if (lastMovePress > Date.now() - 500){
      mover.start('copy')
    } else {
      mover.start()
    }
    beginShift()
    lastMovePress = Date.now()
    isSelecting = true

  }, function(){
    if (!mover.beginMove()){
      endMove()
    }
    isSelecting = false
    endShift()
  })



  function beginShift(){
    releaseShift.push(undoButton.grab(function(){
      this.flash(stateLights.green, 200)
      learnButton.flash(stateLights.green, 100)
      looper.setLength((looper.getLength()||1) / 2, currentPosition)
    }))
    releaseShift.push(redoButton.grab(function(){
      this.flash(stateLights.green, 200)
      learnButton.flash(stateLights.green, 100)
      looper.setLength((looper.getLength()||1) * 2, currentPosition)
    }))

    releaseMove.push(suppressButton.grab(function(){
      var notesToSuppress = mover.getTargetSelection() || mover.getSelection()
      notesToSuppress && notesToSuppress.forEach(function(note){
        releaseSuppress.push(noteMatrix.getButton(note).light(stateLights.red))
      })
      releaseSuppress.push(looper.transform('suppress', notesToSuppress))
    }, function(){
      releaseSuppress.forEach(invoke)
      releaseSuppress = []
    }))

  }

  function endShift(){
    releaseShift.forEach(invoke)
    releaseShift = []
  }

  function endMove(){
    releaseSuppress.forEach(invoke)
    releaseMove.forEach(invoke)
    releaseSuppress = []
    releaseMove = []
  }

  var suppressButton = controller.createButton([176, 105], function(){
    this.turnOn(stateLights.red)
    suppressor.start()
  }, function(){
    this.turnOff()
    suppressor.stop()
  })

  var holdButton = controller.createButton([176, 108], function(){
    this.turnOn(stateLights.yellow)
    holder.start()
  }, function(){
    this.turnOff()
    holder.stop()
  })

  var undoButton = controller.createButton([176, 106], function(){
    this.flash(stateLights.red, 100)
    looper.undo()
  })

  undoButton.setOff(stateLights.redLow)

  var redoButton = controller.createButton([176, 107], function(){
    this.flash(stateLights.red, 100)
    looper.redo()
  })

  redoButton.setOff(stateLights.redLow)


  var clearRepeatButton = controller.createButton([144, 8], function(){
    clearRepeat()
    this.turnOn(stateLights.amberLow)
    repeater.stop()
  })

  var mover = Mover([
    [noteMatrix, looper],
    [snap1Button, snapper1],
    [snap2Button, snapper2]
  ], stateLights.green)

  mover.on('start', function(mode){
    if (mode === 'copy'){
      moveButton.turnOn(stateLights.amber)
    } else {
      moveButton.turnOn(stateLights.green)
    }
  }).on('clear', function(){
    moveButton.turnOff()
  })

  function clearRepeat(){
    holder.setLength(2/1)
    clearRepeatButton.turnOff()
    repeatButtons.forEach(function(button){
      button.turnOff()
    })
  }

  clearRepeatButton.turnOn(stateLights.amberLow)

  var repeatButtons = repeatStates.map(function(length, i){
    var id = 8 + (i*16)
    return controller.createButton([144, id+16], function(){
      clearRepeat()
      this.turnOn(stateLights.amberLow)
      repeater.start(length)
      holder.setLength(length)
    })
  })

  var sideButtons = [clearRepeatButton].concat(repeatButtons)

  var lastDisplayPosition = -1
  function setDisplayPosition(position){
    var lastButton = sideButtons[lastDisplayPosition]
    var button = sideButtons[position]
    if (lastButton){
      lastButton.setOff(stateLights.off)
    }
    if (button){
      button.flash(stateLights.green)
      button.setOff(stateLights.greenLow)
    }
    lastDisplayPosition = position
  }

  return control
}


function diff(ary1, ary2){
  return ary1.filter(function(i) {return !(ary2.indexOf(i) > -1);});
}


function generateNoteGrid(message, offset){
  var result = []
  var message = message || 144
  var offset = offset || 0

  for (var y=0;y<8;y++){
    for (var x=0;x<8;x++){
      result.push([
        [144, (y*16) + x],
        [144, offset++]
      ])
    }
  }

  return result
}

function invoke(func){
  func()
}