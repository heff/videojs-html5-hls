videojs.Html5.registerSourceHandler({
  canHandleSource: function(source){
    // Requires Media Source Extensions
    if (!window.MediaSource) {
      return '';
    }

    // Check if the type is supported
    if (/application\/x-mpegURL|video\/m3u8/.test(source.type)) {
      return 'maybe';
    }

    // Check if the file extension matches
    if (/\.m3u8$/i.test(source.src)) {
      return 'maybe';
    }

    return '';
  },
  handleSource: function(source, tech){
    return new Html5HLS(source, tech);
  }
}, 0); // first inline


function Html5HLS(source, tech){
  var mediaSource = new MediaSource();

  // Temporarily hard-coding the file for testing
  var FILE = '../test.webm';

  this.source = source;
  this.tech = tech;
  this.mediaSource = mediaSource;
  this.mediaSourceURL = window.URL.createObjectURL(mediaSource)
  
  // Set the src of the video element to the blob URL
  tech.setSrc(this.mediaSourceURL);

  mediaSource.addEventListener('sourceopen', function(e) {
    var sourceBuffer = mediaSource.addSourceBuffer('video/webm;codecs="vorbis,vp8"');

    console.log('MediaSource readyState: ' + this.readyState);

    videojs.xhr({
      uri: FILE,
      responseType: 'arraybuffer'
    }, function(err, response, responseBody){
      var uInt8Array = new Uint8Array(responseBody)
      var file = new Blob([uInt8Array], {type: 'video/webm'});
      var NUM_CHUNKS = 5;
      var chunkSize = Math.ceil(file.size / NUM_CHUNKS);

      console.log('Chunk size: ' + chunkSize + ', total size: ' + file.size);

      // Slice the video into NUM_CHUNKS and append each to the media element.
      var i = 0;

      (function readChunk_(i) {
        var reader = new FileReader();

        // Reads aren't guaranteed to finish in the same order they're started in,
        // so we need to read + append the next chunk after the previous reader
        // is done (onload is fired).
        reader.onload = function(e) {
          sourceBuffer.appendBuffer(new Uint8Array(e.target.result));
          console.log('Appending chunk: ' + i);
          if (i == NUM_CHUNKS - 1) {
            mediaSource.endOfStream();
          } else {
            if (tech.paused()) {
              tech.play(); // Start playing after 1st chunk is appended.
            }
            readChunk_(++i);
          }
        };

        var startByte = chunkSize * i;
        var chunk = file.slice(startByte, startByte + chunkSize);

        reader.readAsArrayBuffer(chunk);
      })(i);  // Start the recursive call by self calling.
    });

  }, false);

  mediaSource.addEventListener('sourceended', function(e) {
    console.log('MediaSource readyState: ' + this.readyState);
  }, false); 
}

/**
 * Clean up the HLS process
 */
Html5HLS.prototype.dispose = function(){};