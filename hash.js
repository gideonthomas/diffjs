var MOD_ADLER = 65521;
var BASE_16 = (1 << 16);
var LARGEST_PRIME_1000 = 1009;
var LARGEST_INT_16 = 0xFFFF; // 2^16 hex representation

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

module.exports = {
  _16bit: hash16,
  _32bit: hash32,
  map: generateHashMap
};
