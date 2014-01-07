var Through = require('through')
var Controller = require('midi-controller')

var Mover = require('./lib/mover')
var Repeater = require('./lib/repeater')
var Suppressor = require('./lib/suppressor')
var Snapper = require('./lib/snapper')
var Holder = require('./lib/holder')

var stateLights = require('./lib/state_lights')

module.exports = function(duplexPort, looper){
  duplexPort.write([176, 0, 0])

  var repeatStates = [1, 2/3, 1/2, 1/3, 1/4, 1/6, 1/8]
  var recordingNotes = []
  var activeNotes = {}
  var currentPosition = 0
  
  var control = Through(function(schedule){
    // bopper data
    var repeatLength = holder.getLength()
    var currentRepeat = Math.floor(schedule.to / repeatLength) * repeatLength

    var step = looper.getLength() / 8
    var currentBeat = Math.floor(schedule.to / step) * step

    if (currentBeat > schedule.from && currentBeat <= schedule.to){
      setDisplayPosition(currentBeat / step % 8)
    }

    if (currentRepeat > schedule.from && currentRepeat <= schedule.to){
      holdButton.flash(stateLights.green, 20)
    }

    var position = schedule.to - looper.getLength()
    var currentNotes = recordingNotes
    currentPosition = schedule.to
    recordingNotes = looper.recorder.getActiveNotes(position, looper.getLength())
    diff(recordingNotes, currentNotes).forEach(refreshButtonState)
    diff(currentNotes, recordingNotes).forEach(refreshButtonState)
  })

  var controller = Controller(duplexPort)

  // wire up buttonMatrix
  var noteMatrix = controller.createNoteMatrix(generateNoteGrid(144, 0), stateLights.amber)
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
    if (looper.getTransformCount()){
      looper.bounce()
    } else if (mover.getSelection() && !mover.getTargetSelection()){
      var grid = repeater.getRepeat() || 1/4
      looper.transform('quantize', grid, mover.getSelection())
      looper.bounce()
    } else {
      looper.store()
    }
  })

  var releaseShift = []
  var releaseSuppress = []

  var lastMovePress = 0

  var moveButton = controller.createButton([176, 111], function(){
    if (lastMovePress > Date.now() - 500){
      this.turnOn(stateLights.amber)
      mover.start('copy')
    } else {
      this.turnOn(stateLights.green)
      mover.start()
    }
    beginShift()
    lastMovePress = Date.now()
  }, function(){
    this.turnOff()
    mover.stop()
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
    releaseShift.push(suppressButton.grab(function(){
      var notesToSuppress = mover.getTargetSelection() || mover.getSelection()
      releaseSuppress = notesToSuppress.map(function(note){
        return noteMatrix.getButton(note).light(stateLights.red)
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
    releaseSuppress.forEach(invoke)
    releaseSuppress = []
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

  var redoButton = controller.createButton([176, 107], function(){
    this.flash(stateLights.red, 100)
    looper.redo()
  })

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

  function clearRepeat(){
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