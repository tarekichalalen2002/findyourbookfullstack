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
import Transaction from '../transaction';
import TransactionPromise from '../transaction-promise';
declare type TransactionCreator = () => TransactionPromise;
declare type TransactionWork<T, Tx = Transaction> = (tx: Tx) => T | Promise<T>;
declare type Resolve<T> = (value: T | PromiseLike<T>) => void;
declare type Reject = (value: any) => void;
export declare class TransactionExecutor {
    private readonly _maxRetryTimeMs;
    private readonly _initialRetryDelayMs;
    private readonly _multiplier;
    private readonly _jitterFactor;
    private _inFlightTimeoutIds;
    constructor(maxRetryTimeMs?: number | null, initialRetryDelayMs?: number, multiplier?: number, jitterFactor?: number);
    execute<T, Tx = Transaction>(transactionCreator: TransactionCreator, transactionWork: TransactionWork<T, Tx>, transactionWrapper?: (tx: Transaction) => Tx): Promise<T>;
    close(): void;
    _retryTransactionPromise<T, Tx = Transaction>(transactionCreator: TransactionCreator, transactionWork: TransactionWork<T, Tx>, error: Error, retryStartTime: number, retryDelayMs: number, transactionWrapper?: (tx: Transaction) => Tx): Promise<T>;
    _executeTransactionInsidePromise<T, Tx = Transaction>(transactionCreator: TransactionCreator, transactionWork: TransactionWork<T, Tx>, resolve: Resolve<T>, reject: Reject, transactionWrapper?: (tx: Transaction) => Tx): Promise<void>;
    _safeExecuteTransactionWork<T, Tx = Transaction>(tx: Tx, transactionWork: TransactionWork<T, Tx>): Promise<T>;
    _handleTransactionWorkSuccess<T>(result: T, tx: Transaction, resolve: Resolve<T>, reject: Reject): void;
    _handleTransactionWorkFailure(error: any, tx: Transaction, reject: Reject): void;
    _computeDelayWithJitter(delayMs: number): number;
    _verifyAfterConstruction(): void;
}
export {};
