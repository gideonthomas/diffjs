var MD5 = require('MD5');
var Hash = require('./hash');
var RollingHash = require('./rolling-hash');

var DEFAULT_SIZE = 512;

function checksum(data, chunkSize) {
  chunkSize = chunkSize || DEFAULT_SIZE;
  var size = data.length;
  var begin = 0;
  var end = chunkSize > size ? size : chunkSize;
  var dataChunk;
  var checksumCount = 0;
  var checksums = [];

  while(begin < size) {
    dataChunk = data.slice(begin, end);
    checksums.push({
      index: checksumCount,
      _32bit: Hash._32bit(dataChunk).sum,
      _md5: MD5(dataChunk)
    });

    // Go to next data chunk
    begin += chunkSize;
    end = end + chunkSize > size ? size : end + chunkSize;
    checksumCount++;
  }

  return checksums;
}

function diff(data, checksums, chunkSize) {
  chunkSize = chunkSize || DEFAULT_SIZE;
  var roll = new RollingHash(data, Hash.map(checksums), chunkSize);
  var diffs = [];
  var currentDiff = null;

  while(roll.hasNext()) {
    roll.next();

    currentDiff = roll.diff();
    if(currentDiff) {
      diffs.push(currentDiff);
    }

    roll.update();
  }

  return diffs;
}

module.exports = {
  checksum: checksum,
  diff: diff
};
