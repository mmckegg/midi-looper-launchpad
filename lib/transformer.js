module.exports = function(noteMatrix, looper, activeColor){
  var transforming = {}
  var loopTransforms = looper.params && looper.params.loopTransforms || {}

  noteMatrix.grab(function(data){
    var key = data[0] + '/' + data[1]

    var button = noteMatrix.getButton(key)

    var transform = loopTransforms[key]
    var existing = transforming[key]

    transforming[key] = null
    existing&&existing.forEach(invoke)

    if (data[2] && Array.isArray(transform)){
      transforming[key] = [
        button.light(activeColor),
        looper.transform.apply(looper, transform)
      ]
      return true
    } else if (existing) {
      return true
    }

    return false
  })
}

function invoke(func){
  func()
}