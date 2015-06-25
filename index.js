var MD5 = require('MD5');

var DEFAULT_SIZE = 512;
var MOD_ADLER = 65521;

function weak32Bit(data, previousChecksum, startIndex, endIndex) {
  var A = 1;
  var B = 0;
  var length = data.length;

  if(!previousChecksum) {
    if(startIndex >= 0 && endIndex >= 0) {
      length = endIndex - startIndex + 1;
    }
    for(var i = 0; i < length; i++) {
      A += data[i];
      B += (length - i) * data[i];
    }
  } else {
    length = endIndex - 1;
    A = previousChecksum.A - data[startIndex - 1] + data[endIndex - 1];
    B = previousChecksum.B - (endIndex - startIndex) * data[startIndex - 1] + A;
  }

  A %= MOD_ADLER;
  B %= MOD_ADLER;

  return {
    A: A,
    B: B,
    sum: A + B * (1 << 16)
  };
}

exports.checksum = function(data, chunkSize) {
  chunkSize = chunkSize || DEFAULT_SIZE;
  var size = data.length;
  var begin = 0;
  var end = chunkSize > size ? size : chunkSize;
  var dataChunk;
  var checksums = [];

  while(begin < size) {
    dataChunk = data.slice(begin, end);
    checksums.push({
      weakChecksum: weak32Bit(dataChunk).sum,
      strongChecksum: MD5(dataChunk)
    });

    // Go to next data chunk
    begin += chunkSize;
    end = end + chunkSize > size ? size : end + chunkSize;
  }

  return checksums;
};

exports.diff = function()
