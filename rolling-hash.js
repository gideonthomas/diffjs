var MD5 = require('MD5');
var Hash = require('./hash');

var CONTINUE = true;
var END = false;

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
  var hash_32 = Hash._32bit(this.data, this.previous_32, this.chunk.begin, this.chunk.end);
  var _16bitMatches = this.hashMap[Hash._16bit(hash_32.sum)];
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

module.exports = RollingHash;
