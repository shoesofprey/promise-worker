'use strict';

var register = require('../register');
var Promise = require('lie');

register(function () {
  setTimeout(() => {
    throw Error("Worker crashed outside the request / response promise chain");
  }, 0);

  return new Promise(function(resolve, reject) {
    setTimeout(function () {resolve("Shouldn't happen");}, 2);
  });
});
