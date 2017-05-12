'use strict';

/* istanbul ignore next */
var MyPromise = typeof Promise !== 'undefined' ? Promise : require('lie');

var messageIds = 0;

function parseJsonSafely(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return false;
  }
}

function onMessage(self, e) {
  var message = parseJsonSafely(e.data);
  if (!message) {
    // Ignore - this message is not for us.
    return;
  }
  var messageId = message[0];
  var error = message[1];
  var result = message[2];

  var callback = self._callbacks[messageId];

  if (!callback) {
    // Ignore - user might have created multiple PromiseWorkers.
    // This message is not for us.
    return;
  }

  delete self._callbacks[messageId];
  callback(error, result);
}

function onError(self, e) {
  var error = Error("General worker error: " + e.message +
          " (" + e.filename + ":" + e.lineno + ")");
  // The worker has had an error that our register didn't catch (so it probably happened outside
  // the promise chain). In any case, we need to reject all in flight promises.
  for (var messageId in self._callbacks) {
    /* istanbul ignore else */
    if (self._callbacks.hasOwnProperty(messageId)) {
      var callback = self._callbacks[messageId];
      delete self._callbacks[messageId];
      callback(error);
    }
  }
  self.onWorkerError(error);
}

function PromiseWorker(worker) {
  var self = this;
  self._worker = worker;
  self._callbacks = {};

  worker.addEventListener('message', function (e) {
    onMessage(self, e);
  });

  worker.addEventListener('error', function(e) {
    onError(self, e);
  });
}

PromiseWorker.prototype.postMessage = function (userMessage) {
  var self = this;
  var messageId = messageIds++;

  var messageToSend = [messageId, userMessage];

  return new MyPromise(function (resolve, reject) {
    self._callbacks[messageId] = function (error, result) {
      if (error) {
        return reject(new Error(error.message));
      }
      resolve(result);
    };
    var jsonMessage = JSON.stringify(messageToSend);
    self._worker.postMessage(jsonMessage);
  });
};

PromiseWorker.prototype.onWorkerError = function() {/* Noop for others to implement. */};

module.exports = PromiseWorker;
