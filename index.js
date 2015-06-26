var MD5 = require('MD5');

var DEFAULT_SIZE = 512;
var MOD_ADLER = 65521;
var BASE_16 = (1 << 16);
var LARGEST_PRIME_1000 = 1009;
var LARGEST_INT_16 = 0xFFFF; // 2^16 hex representation
var CONTINUE = true;
var END = false;

function hash16(data) {
  var data_16 = data >> 16;
  var dataMult = data * LARGEST_PRIME_1000;

  return LARGEST_INT_16 & (data_16 ^ dataMult);
}

function hash32(data, previousChecksum, startIndex, endIndex) {
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
    sum: A + B * BASE_16
  };
}

function generateHashMap(checksums) {
  var hashMap = {};

  checksums.forEach(function(checksum) {
    var _16bit = hash16(checksum._32bit);

    if(!hashMap[_16bit]) {
      hashMap[_16bit] = [];
    }

    hashMap[_16bit].push(checksum);
  });

  return hashMap;
}

function RollingHash(data, hashMap_16, chunkSize) {
  var size = data.length;

  this.data = data;
  this.dataSize = data.length;
  this.hashMap = hashMap_16;
  this.chunk = {
    begin: 0,
    end: chunkSize > size ? size : chunkSize
  };
  this.match = {
    at: null,
    previous: 0
  };
  this.previous_32 = null;
}

RollingHash.prototype.hasNext = function() {
  return this.chunk.end <= this.dataSize;
};

RollingHash.prototype.next = function() {
  var chunk = this.chunk;
  var hash_32 = hash32(this.data, this.previous_32, this.chunk.begin, this.chunk.end);
  var _16bitMatches = this.hashMap[hash16(hash_32.sum)];
  this.previous_32 = hash_32;
  this.match.at = null;

  if(!_16bitMatches) {
    return;
  }

  _16bitMatches.every(function(checksum) {
    // Weak hash comparison
    if(checksum._32bit !== hash_32.sum) {
      return CONTINUE;
    }

    // Strong hash comparison
    if(checksum._md5 !== MD5(this.data.slice(chunk.begin, chunk.end))) {
      return CONTINUE;
    }

    this.match.at = checksum.index;
    return END;
  });
};

RollingHash.prototype.diff = function() {
  var match = this.match.at;
  var previousMatch = this.match.previous;
  var _diff = null;

  if(match) {
    _diff = {};
    _diff.index = match;

    if(this.chunk.begin < previousMatch) {
      _diff.data = this.data.slice(previousMatch - 1, this.chunk.end);
    } else if(this.chunk.begin > previousMatch) {
      _diff.data = this.data.slice(previousMatch, this.chunk.begin);
    }

  } else if(this.chunk.end === this.dataSize) {
    _diff = { data: this.data.slice(previousMatch) };
  }

  return _diff;
};

RollingHash.prototype.update = function() {
  if(this.match.at) {
    this.match.previous = this.chunk.end;
  }

  this.chunk.begin++;
  this.chunk.end++;
};

exports.checksum = function(data, chunkSize) {
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
      _32bit: hash32(dataChunk).sum,
      _md5: MD5(dataChunk)
    });

    // Go to next data chunk
    begin += chunkSize;
    end = end + chunkSize > size ? size : end + chunkSize;
    checksumCount++;
  }

  return checksums;
};

exports.diff = function(data, checksums, chunkSize) {
  chunkSize = chunkSize || DEFAULT_SIZE;
  var roll = new RollingHash(data, generateHashMap(checksums), chunkSize);
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
};
