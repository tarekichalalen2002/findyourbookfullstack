"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionConfig = exports.WRITE = exports.READ = exports.Driver = void 0;
var bookmarks_1 = require("./internal/bookmarks");
var configured_custom_resolver_1 = __importDefault(require("./internal/resolver/configured-custom-resolver"));
var constants_1 = require("./internal/constants");
var logger_1 = require("./internal/logger");
var session_1 = __importDefault(require("./session"));
var util_1 = require("./internal/util");
var DEFAULT_MAX_CONNECTION_LIFETIME = 60 * 60 * 1000; // 1 hour
/**
 * The default record fetch size. This is used in Bolt V4 protocol to pull query execution result in batches.
 * @type {number}
 */
var DEFAULT_FETCH_SIZE = 1000;
/**
 * Constant that represents read session access mode.
 * Should be used like this: `driver.session({ defaultAccessMode: neo4j.session.READ })`.
 * @type {string}
 */
var READ = constants_1.ACCESS_MODE_READ;
exports.READ = READ;
/**
 * Constant that represents write session access mode.
 * Should be used like this: `driver.session({ defaultAccessMode: neo4j.session.WRITE })`.
 * @type {string}
 */
var WRITE = constants_1.ACCESS_MODE_WRITE;
exports.WRITE = WRITE;
var idGenerator = 0;
/**
 * The session configuration
 *
 * @interface
 */
var SessionConfig = /** @class */ (function () {
    /**
     * @constructor
     * @private
     */
    function SessionConfig() {
        /**
         * The access mode of this session, allowed values are {@link READ} and {@link WRITE}.
         * **Default**: {@link WRITE}
         * @type {string}
         */
        this.defaultAccessMode = WRITE;
        /**
         * The initial reference or references to some previous
         * transactions. Value is optional and absence indicates that that the bookmarks do not exist or are unknown.
         * @type {string|string[]|undefined}
         */
        this.bookmarks = [];
        /**
         * The database this session will operate on.
         *
         * This option has no explicit value by default, but it is recommended to set
         * one if the target database is known in advance. This has the benefit of
         * ensuring a consistent target database name throughout the session in a
         * straightforward way and potentially simplifies driver logic as well as
         * reduces network communication resulting in better performance.
         *
         * Usage of Cypher clauses like USE is not a replacement for this option.
         * The driver does not parse any Cypher.
         *
         * When no explicit name is set, the driver behavior depends on the connection
         * URI scheme supplied to the driver on instantiation and Bolt protocol
         * version.
         *
         * Specifically, the following applies:
         *
         * - **bolt schemes** - queries are dispatched to the server for execution
         *   without explicit database name supplied, meaning that the target database
         *   name for query execution is determined by the server. It is important to
         *   note that the target database may change (even within the same session),
         *   for instance if the user's home database is changed on the server.
         *
         * - **neo4j schemes** - providing that Bolt protocol version 4.4, which was
         *   introduced with Neo4j server 4.4, or above is available, the driver
         *   fetches the user's home database name from the server on first query
         *   execution within the session and uses the fetched database name
         *   explicitly for all queries executed within the session. This ensures that
         *   the database name remains consistent within the given session. For
         *   instance, if the user's home database name is 'movies' and the server
         *   supplies it to the driver upon database name fetching for the session,
         *   all queries within that session are executed with the explicit database
         *   name 'movies' supplied. Any change to the user’s home database is
         *   reflected only in sessions created after such change takes effect. This
         *   behavior requires additional network communication. In clustered
         *   environments, it is strongly recommended to avoid a single point of
         *   failure. For instance, by ensuring that the connection URI resolves to
         *   multiple endpoints. For older Bolt protocol versions the behavior is the
         *   same as described for the **bolt schemes** above.
         *
         * @type {string|undefined}
         */
        this.database = '';
        /**
         * The username which the user wants to impersonate for the duration of the session.
         *
         * @type {string|undefined}
         */
        this.impersonatedUser = undefined;
        /**
         * The record fetch size of each batch of this session.
         *
         * Use {@link FETCH_ALL} to always pull all records in one batch. This will override the config value set on driver config.
         *
         * @type {number|undefined}
         */
        this.fetchSize = undefined;
        /**
         * Configure a BookmarkManager for the session to use
         *
         * A BookmarkManager is a piece of software responsible for keeping casual consistency between different sessions by sharing bookmarks
         * between the them.
         * Enabling it is done by supplying an BookmarkManager implementation instance to this param.
         * A default implementation could be acquired by calling the factory function {@link bookmarkManager}.
         *
         * **Warning**: Sharing the same BookmarkManager instance across multiple sessions can have a negative impact
         * on performance since all the queries will wait for the latest changes being propagated across the cluster.
         * For keeping consistency between a group of queries, use {@link Session} for grouping them.
         * For keeping consistency between a group of sessions, use {@link BookmarkManager} instance for grouping them.
         *
         * @example
         * const bookmarkManager = neo4j.bookmarkManager()
         * const linkedSession1 = driver.session({ database:'neo4j', bookmarkManager })
         * const linkedSession2 = driver.session({ database:'neo4j', bookmarkManager })
         * const unlinkedSession = driver.session({ database:'neo4j' })
         *
         * // Creating Driver User
         * const createUserQueryResult = await linkedSession1.run('CREATE (p:Person {name: $name})', { name: 'Driver User'})
         *
         * // Reading Driver User will *NOT* wait of the changes being propagated to the server before RUN the query
         * // So the 'Driver User' person might not exist in the Result
         * const unlinkedReadResult = await unlinkedSession.run('CREATE (p:Person {name: $name}) RETURN p', { name: 'Driver User'})
         *
         * // Reading Driver User will wait of the changes being propagated to the server before RUN the query
         * // So the 'Driver User' person should exist in the Result, unless deleted.
         * const linkedResult = await linkedSession2.run('CREATE (p:Person {name: $name}) RETURN p', { name: 'Driver User'})
         *
         * await linkedSession1.close()
         * await linkedSession2.close()
         * await unlinkedSession.close()
         *
         * @experimental
         * @type {BookmarkManager|undefined}
         * @since 5.0
         */
        this.bookmarkManager = undefined;
    }
    return SessionConfig;
}());
exports.SessionConfig = SessionConfig;
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
var Driver = /** @class */ (function () {
    /**
     * You should not be calling this directly, instead use {@link driver}.
     * @constructor
     * @protected
     * @param {Object} meta Metainformation about the driver
     * @param {Object} config
     * @param {function(id: number, config:Object, log:Logger, hostNameResolver: ConfiguredCustomResolver): ConnectionProvider } createConnectonProvider Creates the connection provider
     * @param {function(args): Session } createSession Creates the a session
    */
    function Driver(meta, config, createConnectonProvider, createSession) {
        if (config === void 0) { config = {}; }
        if (createSession === void 0) { createSession = function (args) { return new session_1.default(args); }; }
        sanitizeConfig(config);
        var log = logger_1.Logger.create(config);
        validateConfig(config, log);
        this._id = idGenerator++;
        this._meta = meta;
        this._config = config;
        this._log = log;
        this._createConnectionProvider = createConnectonProvider;
        this._createSession = createSession;
        /**
         * Reference to the connection provider. Initialized lazily by {@link _getOrCreateConnectionProvider}.
         * @type {ConnectionProvider}
         * @protected
         */
        this._connectionProvider = null;
        this._afterConstruction();
    }
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
    Driver.prototype.verifyConnectivity = function (_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.database, database = _c === void 0 ? '' : _c;
        var connectionProvider = this._getOrCreateConnectionProvider();
        return connectionProvider.verifyConnectivityAndGetServerInfo({ database: database, accessMode: READ });
    };
    /**
     * Get ServerInfo for the giver database.
     *
     * @param {Object} param - The object parameter
     * @param {string} param.database - The target database to verify connectivity for.
     * @returns {Promise<void>} promise resolved with void or rejected with error.
     */
    Driver.prototype.getServerInfo = function (_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.database, database = _c === void 0 ? '' : _c;
        var connectionProvider = this._getOrCreateConnectionProvider();
        return connectionProvider.verifyConnectivityAndGetServerInfo({ database: database, accessMode: READ });
    };
    /**
     * Returns whether the server supports multi database capabilities based on the protocol
     * version negotiated via handshake.
     *
     * Note that this function call _always_ causes a round-trip to the server.
     *
     * @returns {Promise<boolean>} promise resolved with a boolean or rejected with error.
     */
    Driver.prototype.supportsMultiDb = function () {
        var connectionProvider = this._getOrCreateConnectionProvider();
        return connectionProvider.supportsMultiDb();
    };
    /**
     * Returns whether the server supports transaction config capabilities based on the protocol
     * version negotiated via handshake.
     *
     * Note that this function call _always_ causes a round-trip to the server.
     *
     * @returns {Promise<boolean>} promise resolved with a boolean or rejected with error.
     */
    Driver.prototype.supportsTransactionConfig = function () {
        var connectionProvider = this._getOrCreateConnectionProvider();
        return connectionProvider.supportsTransactionConfig();
    };
    /**
     * Returns whether the server supports user impersonation capabilities based on the protocol
     * version negotiated via handshake.
     *
     * Note that this function call _always_ causes a round-trip to the server.
     *
     * @returns {Promise<boolean>} promise resolved with a boolean or rejected with error.
     */
    Driver.prototype.supportsUserImpersonation = function () {
        var connectionProvider = this._getOrCreateConnectionProvider();
        return connectionProvider.supportsUserImpersonation();
    };
    /**
     * Returns the protocol version negotiated via handshake.
     *
     * Note that this function call _always_ causes a round-trip to the server.
     *
     * @returns {Promise<number>} the protocol version negotiated via handshake.
     * @throws {Error} When protocol negotiation fails
     */
    Driver.prototype.getNegotiatedProtocolVersion = function () {
        var connectionProvider = this._getOrCreateConnectionProvider();
        return connectionProvider.getNegotiatedProtocolVersion();
    };
    /**
     * Returns boolean to indicate if driver has been configured with encryption enabled.
     *
     * @returns {boolean}
     */
    Driver.prototype.isEncrypted = function () {
        return this._isEncrypted();
    };
    /**
     * @protected
     * @returns {boolean}
     */
    Driver.prototype._supportsRouting = function () {
        return this._meta.routing;
    };
    /**
     * Returns boolean to indicate if driver has been configured with encryption enabled.
     *
     * @protected
     * @returns {boolean}
     */
    Driver.prototype._isEncrypted = function () {
        return this._config.encrypted === util_1.ENCRYPTION_ON || this._config.encrypted === true;
    };
    /**
     * Returns the configured trust strategy that the driver has been configured with.
     *
     * @protected
     * @returns {TrustStrategy}
     */
    Driver.prototype._getTrust = function () {
        return this._config.trust;
    };
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
    Driver.prototype.session = function (_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.defaultAccessMode, defaultAccessMode = _c === void 0 ? WRITE : _c, bookmarkOrBookmarks = _b.bookmarks, _d = _b.database, database = _d === void 0 ? '' : _d, impersonatedUser = _b.impersonatedUser, fetchSize = _b.fetchSize, bookmarkManager = _b.bookmarkManager;
        return this._newSession({
            defaultAccessMode: defaultAccessMode,
            bookmarkOrBookmarks: bookmarkOrBookmarks,
            database: database,
            reactive: false,
            impersonatedUser: impersonatedUser,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            fetchSize: validateFetchSizeValue(fetchSize, this._config.fetchSize),
            bookmarkManager: bookmarkManager
        });
    };
    /**
     * Close all open sessions and other associated resources. You should
     * make sure to use this when you are done with this driver instance.
     * @public
     * @return {Promise<void>} promise resolved when the driver is closed.
     */
    Driver.prototype.close = function () {
        this._log.info("Driver ".concat(this._id, " closing"));
        if (this._connectionProvider != null) {
            return this._connectionProvider.close();
        }
        return Promise.resolve();
    };
    /**
     * @protected
     */
    Driver.prototype._afterConstruction = function () {
        this._log.info("".concat(this._meta.typename, " driver ").concat(this._id, " created for server address ").concat(this._meta.address.toString()));
    };
    /**
     * @private
     */
    Driver.prototype._newSession = function (_a) {
        var defaultAccessMode = _a.defaultAccessMode, bookmarkOrBookmarks = _a.bookmarkOrBookmarks, database = _a.database, reactive = _a.reactive, impersonatedUser = _a.impersonatedUser, fetchSize = _a.fetchSize, bookmarkManager = _a.bookmarkManager;
        var sessionMode = session_1.default._validateSessionMode(defaultAccessMode);
        var connectionProvider = this._getOrCreateConnectionProvider();
        var bookmarks = bookmarkOrBookmarks != null
            ? new bookmarks_1.Bookmarks(bookmarkOrBookmarks)
            : bookmarks_1.Bookmarks.empty();
        return this._createSession({
            mode: sessionMode,
            database: database !== null && database !== void 0 ? database : '',
            connectionProvider: connectionProvider,
            bookmarks: bookmarks,
            config: this._config,
            reactive: reactive,
            impersonatedUser: impersonatedUser,
            fetchSize: fetchSize,
            bookmarkManager: bookmarkManager
        });
    };
    /**
     * @private
     */
    Driver.prototype._getOrCreateConnectionProvider = function () {
        if (this._connectionProvider == null) {
            this._connectionProvider = this._createConnectionProvider(this._id, this._config, this._log, createHostNameResolver(this._config));
        }
        return this._connectionProvider;
    };
    return Driver;
}());
exports.Driver = Driver;
/**
 * @private
 * @returns {Object} the given config.
 */
function validateConfig(config, log) {
    var resolver = config.resolver;
    if (resolver !== null && resolver !== undefined && typeof resolver !== 'function') {
        throw new TypeError("Configured resolver should be a function. Got: ".concat(typeof resolver));
    }
    if (config.connectionAcquisitionTimeout < config.connectionTimeout) {
        log.warn('Configuration for "connectionAcquisitionTimeout" should be greater than ' +
            'or equal to "connectionTimeout". Otherwise, the connection acquisition ' +
            'timeout will take precedence for over the connection timeout in scenarios ' +
            'where a new connection is created while it is acquired');
    }
    return config;
}
/**
 * @private
 */
function sanitizeConfig(config) {
    config.maxConnectionLifetime = sanitizeIntValue(config.maxConnectionLifetime, DEFAULT_MAX_CONNECTION_LIFETIME);
    config.maxConnectionPoolSize = sanitizeIntValue(config.maxConnectionPoolSize, constants_1.DEFAULT_POOL_MAX_SIZE);
    config.connectionAcquisitionTimeout = sanitizeIntValue(config.connectionAcquisitionTimeout, constants_1.DEFAULT_POOL_ACQUISITION_TIMEOUT);
    config.fetchSize = validateFetchSizeValue(config.fetchSize, DEFAULT_FETCH_SIZE);
    config.connectionTimeout = extractConnectionTimeout(config);
}
/**
 * @private
 */
function sanitizeIntValue(rawValue, defaultWhenAbsent) {
    var sanitizedValue = parseInt(rawValue, 10);
    if (sanitizedValue > 0 || sanitizedValue === 0) {
        return sanitizedValue;
    }
    else if (sanitizedValue < 0) {
        return Number.MAX_SAFE_INTEGER;
    }
    else {
        return defaultWhenAbsent;
    }
}
/**
 * @private
 */
function validateFetchSizeValue(rawValue, defaultWhenAbsent) {
    var fetchSize = parseInt(rawValue, 10);
    if (fetchSize > 0 || fetchSize === constants_1.FETCH_ALL) {
        return fetchSize;
    }
    else if (fetchSize === 0 || fetchSize < 0) {
        throw new Error("The fetch size can only be a positive value or ".concat(constants_1.FETCH_ALL, " for ALL. However fetchSize = ").concat(fetchSize));
    }
    else {
        return defaultWhenAbsent;
    }
}
/**
 * @private
 */
function extractConnectionTimeout(config) {
    var configuredTimeout = parseInt(config.connectionTimeout, 10);
    if (configuredTimeout === 0) {
        // timeout explicitly configured to 0
        return null;
    }
    else if (!isNaN(configuredTimeout) && configuredTimeout < 0) {
        // timeout explicitly configured to a negative value
        return null;
    }
    else if (isNaN(configuredTimeout)) {
        // timeout not configured, use default value
        return constants_1.DEFAULT_CONNECTION_TIMEOUT_MILLIS;
    }
    else {
        // timeout configured, use the provided value
        return configuredTimeout;
    }
}
/**
 * @private
 * @returns {ConfiguredCustomResolver} new custom resolver that wraps the passed-in resolver function.
 *              If resolved function is not specified, it defaults to an identity resolver.
 */
function createHostNameResolver(config) {
    return new configured_custom_resolver_1.default(config.resolver);
}
exports.default = Driver;
