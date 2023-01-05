"use strict";
/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* eslint-disable @typescript-eslint/promise-function-async */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionExecutor = void 0;
var error_1 = require("../error");
var DEFAULT_MAX_RETRY_TIME_MS = 30 * 1000; // 30 seconds
var DEFAULT_INITIAL_RETRY_DELAY_MS = 1000; // 1 seconds
var DEFAULT_RETRY_DELAY_MULTIPLIER = 2.0;
var DEFAULT_RETRY_DELAY_JITTER_FACTOR = 0.2;
var TransactionExecutor = /** @class */ (function () {
    function TransactionExecutor(maxRetryTimeMs, initialRetryDelayMs, multiplier, jitterFactor) {
        this._maxRetryTimeMs = _valueOrDefault(maxRetryTimeMs, DEFAULT_MAX_RETRY_TIME_MS);
        this._initialRetryDelayMs = _valueOrDefault(initialRetryDelayMs, DEFAULT_INITIAL_RETRY_DELAY_MS);
        this._multiplier = _valueOrDefault(multiplier, DEFAULT_RETRY_DELAY_MULTIPLIER);
        this._jitterFactor = _valueOrDefault(jitterFactor, DEFAULT_RETRY_DELAY_JITTER_FACTOR);
        this._inFlightTimeoutIds = [];
        this._verifyAfterConstruction();
    }
    TransactionExecutor.prototype.execute = function (transactionCreator, transactionWork, transactionWrapper) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._executeTransactionInsidePromise(transactionCreator, transactionWork, resolve, reject, transactionWrapper).catch(reject);
        }).catch(function (error) {
            var retryStartTimeMs = Date.now();
            var retryDelayMs = _this._initialRetryDelayMs;
            return _this._retryTransactionPromise(transactionCreator, transactionWork, error, retryStartTimeMs, retryDelayMs, transactionWrapper);
        });
    };
    TransactionExecutor.prototype.close = function () {
        // cancel all existing timeouts to prevent further retries
        this._inFlightTimeoutIds.forEach(function (timeoutId) { return clearTimeout(timeoutId); });
        this._inFlightTimeoutIds = [];
    };
    TransactionExecutor.prototype._retryTransactionPromise = function (transactionCreator, transactionWork, error, retryStartTime, retryDelayMs, transactionWrapper) {
        var _this = this;
        var elapsedTimeMs = Date.now() - retryStartTime;
        if (elapsedTimeMs > this._maxRetryTimeMs || !(0, error_1.isRetriableError)(error)) {
            return Promise.reject(error);
        }
        return new Promise(function (resolve, reject) {
            var nextRetryTime = _this._computeDelayWithJitter(retryDelayMs);
            var timeoutId = setTimeout(function () {
                // filter out this timeoutId when time has come and function is being executed
                _this._inFlightTimeoutIds = _this._inFlightTimeoutIds.filter(function (id) { return id !== timeoutId; });
                _this._executeTransactionInsidePromise(transactionCreator, transactionWork, resolve, reject, transactionWrapper).catch(reject);
            }, nextRetryTime);
            // add newly created timeoutId to the list of all in-flight timeouts
            _this._inFlightTimeoutIds.push(timeoutId);
        }).catch(function (error) {
            var nextRetryDelayMs = retryDelayMs * _this._multiplier;
            return _this._retryTransactionPromise(transactionCreator, transactionWork, error, retryStartTime, nextRetryDelayMs, transactionWrapper);
        });
    };
    TransactionExecutor.prototype._executeTransactionInsidePromise = function (transactionCreator, transactionWork, resolve, reject, transactionWrapper) {
        return __awaiter(this, void 0, void 0, function () {
            var tx, error_2, wrap, wrappedTx, resultPromise;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, transactionCreator()];
                    case 1:
                        tx = _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _a.sent();
                        // failed to create a transaction
                        reject(error_2);
                        return [2 /*return*/];
                    case 3:
                        wrap = transactionWrapper !== null && transactionWrapper !== void 0 ? transactionWrapper : (function (tx) { return tx; });
                        wrappedTx = wrap(tx);
                        resultPromise = this._safeExecuteTransactionWork(wrappedTx, transactionWork);
                        resultPromise
                            .then(function (result) {
                            return _this._handleTransactionWorkSuccess(result, tx, resolve, reject);
                        })
                            .catch(function (error) { return _this._handleTransactionWorkFailure(error, tx, reject); });
                        return [2 /*return*/];
                }
            });
        });
    };
    TransactionExecutor.prototype._safeExecuteTransactionWork = function (tx, transactionWork) {
        try {
            var result = transactionWork(tx);
            // user defined callback is supposed to return a promise, but it might not; so to protect against an
            // incorrect API usage we wrap the returned value with a resolved promise; this is effectively a
            // validation step without type checks
            return Promise.resolve(result);
        }
        catch (error) {
            return Promise.reject(error);
        }
    };
    TransactionExecutor.prototype._handleTransactionWorkSuccess = function (result, tx, resolve, reject) {
        if (tx.isOpen()) {
            // transaction work returned resolved promise and transaction has not been committed/rolled back
            // try to commit the transaction
            tx.commit()
                .then(function () {
                // transaction was committed, return result to the user
                resolve(result);
            })
                .catch(function (error) {
                // transaction failed to commit, propagate the failure
                reject(error);
            });
        }
        else {
            // transaction work returned resolved promise and transaction is already committed/rolled back
            // return the result returned by given transaction work
            resolve(result);
        }
    };
    TransactionExecutor.prototype._handleTransactionWorkFailure = function (error, tx, reject) {
        if (tx.isOpen()) {
            // transaction work failed and the transaction is still open, roll it back and propagate the failure
            tx.rollback()
                .catch(function (ignore) {
                // ignore the rollback error
            })
                .then(function () { return reject(error); }) // propagate the original error we got from the transaction work
                .catch(reject);
        }
        else {
            // transaction is already rolled back, propagate the error
            reject(error);
        }
    };
    TransactionExecutor.prototype._computeDelayWithJitter = function (delayMs) {
        var jitter = delayMs * this._jitterFactor;
        var min = delayMs - jitter;
        var max = delayMs + jitter;
        return Math.random() * (max - min) + min;
    };
    TransactionExecutor.prototype._verifyAfterConstruction = function () {
        if (this._maxRetryTimeMs < 0) {
            throw (0, error_1.newError)('Max retry time should be >= 0: ' + this._maxRetryTimeMs.toString());
        }
        if (this._initialRetryDelayMs < 0) {
            throw (0, error_1.newError)('Initial retry delay should >= 0: ' + this._initialRetryDelayMs.toString());
        }
        if (this._multiplier < 1.0) {
            throw (0, error_1.newError)('Multiplier should be >= 1.0: ' + this._multiplier.toString());
        }
        if (this._jitterFactor < 0 || this._jitterFactor > 1) {
            throw (0, error_1.newError)('Jitter factor should be in [0.0, 1.0]: ' + this._jitterFactor.toFixed());
        }
    };
    return TransactionExecutor;
}());
exports.TransactionExecutor = TransactionExecutor;
function _valueOrDefault(value, defaultValue) {
    if (value != null) {
        return value;
    }
    return defaultValue;
}
