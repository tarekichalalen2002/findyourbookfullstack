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
import ConnectionProvider from './connection-provider';
import { Bookmarks } from './internal/bookmarks';
import ConfiguredCustomResolver from './internal/resolver/configured-custom-resolver';
import { Logger } from './internal/logger';
import Session from './session';
import { ServerInfo } from './result-summary';
import { EncryptionLevel, LoggingConfig, TrustStrategy, SessionMode } from './types';
import { ServerAddress } from './internal/server-address';
import BookmarkManager from './bookmark-manager';
/**
 * Constant that represents read session access mode.
 * Should be used like this: `driver.session({ defaultAccessMode: neo4j.session.READ })`.
 * @type {string}
 */
declare const READ: SessionMode;
/**
 * Constant that represents write session access mode.
 * Should be used like this: `driver.session({ defaultAccessMode: neo4j.session.WRITE })`.
 * @type {string}
 */
declare const WRITE: SessionMode;
interface MetaInfo {
    routing: boolean;
    typename: string;
    address: string | ServerAddress;
}
declare type CreateConnectionProvider = (id: number, config: Object, log: Logger, hostNameResolver: ConfiguredCustomResolver) => ConnectionProvider;
declare type CreateSession = (args: {
    mode: SessionMode;
    connectionProvider: ConnectionProvider;
    bookmarks?: Bookmarks;
    database: string;
    config: any;
    reactive: boolean;
    fetchSize: number;
    impersonatedUser?: string;
    bookmarkManager?: BookmarkManager;
}) => Session;
interface DriverConfig {
    encrypted?: EncryptionLevel | boolean;
    trust?: TrustStrategy;
    fetchSize?: number;
    logging?: LoggingConfig;
}
/**
 * The session configuration
 *
 * @interface
 */
declare class SessionConfig {
    defaultAccessMode?: SessionMode;
    bookmarks?: string | string[];
    database?: string;
    impersonatedUser?: string;
    fetchSize?: number;
    bookmarkManager?: BookmarkManager;
    /**
     * @constructor
     * @private
     */
    constructor();
}
/**
 * A driver maintains one or more {@link Session}s with a remote
 * Neo4j instance. Through the {@link Session}s you can send queries
 * and retrieve results from the database.
 *
 * Drivers are reasonably expensive to create - you should strive to keep one
 * driver instance around per Neo4j Instance you connect to.
 *
 * @access public
 */
declare class Driver {
    private readonly _id;
    private readonly _meta;
    private readonly _config;
    private readonly _log;
    private readonly _createConnectionProvider;
    private _connectionProvider;
    private readonly _createSession;
    /**
     * You should not be calling this directly, instead use {@link driver}.
     * @constructor
     * @protected
     * @param {Object} meta Metainformation about the driver
     * @param {Object} config
     * @param {function(id: number, config:Object, log:Logger, hostNameResolver: ConfiguredCustomResolver): ConnectionProvider } createConnectonProvider Creates the connection provider
     * @param {function(args): Session } createSession Creates the a session
    */
    constructor(meta: MetaInfo, config: DriverConfig | undefined, createConnectonProvider: CreateConnectionProvider, createSession?: CreateSession);
    /**
     * Verifies connectivity of this driver by trying to open a connection with the provided driver options.
     *
     * @deprecated This return of this method will change in 6.0.0 to not async return the {@link ServerInfo} and
     * async return {@link void} instead. If you need to use the server info, use {@link getServerInfo} instead.
     *
     * @public
     * @param {Object} param - The object parameter
     * @param {string} param.database - The target database to verify connectivity for.
     * @returns {Promise<ServerInfo>} promise resolved with server info or rejected with error.
     */
    verifyConnectivity({ database }?: {
        database?: string;
    }): Promise<ServerInfo>;
    /**
     * Get ServerInfo for the giver database.
     *
     * @param {Object} param - The object parameter
     * @param {string} param.database - The target database to verify connectivity for.
     * @returns {Promise<void>} promise resolved with void or rejected with error.
     */
    getServerInfo({ database }?: {
        database?: string;
    }): Promise<ServerInfo>;
    /**
     * Returns whether the server supports multi database capabilities based on the protocol
     * version negotiated via handshake.
     *
     * Note that this function call _always_ causes a round-trip to the server.
     *
     * @returns {Promise<boolean>} promise resolved with a boolean or rejected with error.
     */
    supportsMultiDb(): Promise<boolean>;
    /**
     * Returns whether the server supports transaction config capabilities based on the protocol
     * version negotiated via handshake.
     *
     * Note that this function call _always_ causes a round-trip to the server.
     *
     * @returns {Promise<boolean>} promise resolved with a boolean or rejected with error.
     */
    supportsTransactionConfig(): Promise<boolean>;
    /**
     * Returns whether the server supports user impersonation capabilities based on the protocol
     * version negotiated via handshake.
     *
     * Note that this function call _always_ causes a round-trip to the server.
     *
     * @returns {Promise<boolean>} promise resolved with a boolean or rejected with error.
     */
    supportsUserImpersonation(): Promise<boolean>;
    /**
     * Returns the protocol version negotiated via handshake.
     *
     * Note that this function call _always_ causes a round-trip to the server.
     *
     * @returns {Promise<number>} the protocol version negotiated via handshake.
     * @throws {Error} When protocol negotiation fails
     */
    getNegotiatedProtocolVersion(): Promise<number>;
    /**
     * Returns boolean to indicate if driver has been configured with encryption enabled.
     *
     * @returns {boolean}
     */
    isEncrypted(): boolean;
    /**
     * @protected
     * @returns {boolean}
     */
    _supportsRouting(): boolean;
    /**
     * Returns boolean to indicate if driver has been configured with encryption enabled.
     *
     * @protected
     * @returns {boolean}
     */
    _isEncrypted(): boolean;
    /**
     * Returns the configured trust strategy that the driver has been configured with.
     *
     * @protected
     * @returns {TrustStrategy}
     */
    _getTrust(): TrustStrategy | undefined;
    /**
     * Acquire a session to communicate with the database. The session will
     * borrow connections from the underlying connection pool as required and
     * should be considered lightweight and disposable.
     *
     * This comes with some responsibility - make sure you always call
     * {@link close} when you are done using a session, and likewise,
     * make sure you don't close your session before you are done using it. Once
     * it is closed, the underlying connection will be released to the connection
     * pool and made available for others to use.
     *
     * @public
     * @param {SessionConfig} param - The session configuration
     * @return {Session} new session.
     */
    session({ defaultAccessMode, bookmarks: bookmarkOrBookmarks, database, impersonatedUser, fetchSize, bookmarkManager }?: SessionConfig): Session;
    /**
     * Close all open sessions and other associated resources. You should
     * make sure to use this when you are done with this driver instance.
     * @public
     * @return {Promise<void>} promise resolved when the driver is closed.
     */
    close(): Promise<void>;
    /**
     * @protected
     */
    _afterConstruction(): void;
    /**
     * @private
     */
    _newSession({ defaultAccessMode, bookmarkOrBookmarks, database, reactive, impersonatedUser, fetchSize, bookmarkManager }: {
        defaultAccessMode: SessionMode;
        bookmarkOrBookmarks?: string | string[];
        database: string;
        reactive: boolean;
        impersonatedUser?: string;
        fetchSize: number;
        bookmarkManager?: BookmarkManager;
    }): Session;
    /**
     * @private
     */
    _getOrCreateConnectionProvider(): ConnectionProvider;
}
export { Driver, READ, WRITE, SessionConfig };
export default Driver;
