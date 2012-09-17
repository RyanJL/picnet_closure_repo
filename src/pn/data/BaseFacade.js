﻿;
goog.provide('pn.data.BaseFacade');

goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('pn.data.Entity');
goog.require('pn.data.LocalCache');
goog.require('pn.data.Query');
goog.require('pn.data.Server');



/**
 * An optimistic (Client assumes the server will succeed) Facade.
 *
 * @constructor
 * @extends {goog.events.EventTarget}
 * @param {string} controller The path to the controller.
 */
pn.data.BaseFacade = function(controller) {
  goog.asserts.assert(goog.isString(controller));

  goog.events.EventTarget.call(this);

  /**
   * @private
   * @type {string}
   */
  this.controller_ = controller;

  /**
   * @protected
   * @type {pn.data.LocalCache}
   */
  this.cache = new pn.data.LocalCache();
  this.registerDisposable(this.cache);


  /**
   * @protected
   * @type {pn.data.Server}
   */
  this.server = new pn.data.Server(controller);
  this.registerDisposable(this.cache);

  /**
   * @private
   * @type {goog.events.EventHandler}
   */
  this.eh_ = new goog.events.EventHandler();
  this.registerDisposable(this.eh_);

  /**
   * @private
   * @type {number}
   */
  this.timerid_ = 0;

  this.proxyServerEvents_();
  this.startUpdateInterval_();
};
goog.inherits(pn.data.BaseFacade, goog.events.EventTarget);

////////////////////////////////////////////////////////////////////////////////
// PUBLIC INTERFACE
////////////////////////////////////////////////////////////////////////////////


/**
 * Makes an arbitrary ajax call to the server.  The results are then
 *    inspected for entities and appropriate caches updated.
 *
 * @param {string} controller The server controller endpoint.
 * @param {string} action The server controller action endpoint.
 * @param {!Object} data The request data.
 * @param {function(?):undefined} callback The success callback.
 */
pn.data.BaseFacade.prototype.ajax =
    function(controller, action, data, callback) {
  goog.asserts.assert(goog.isString(controller));
  goog.asserts.assert(goog.isString(action));
  goog.asserts.assert(goog.isObject(data));
  goog.asserts.assert(goog.isFunction(callback));

  this.server.ajax(controller, action, data, this.getLastUpdate(),
      goog.bind(this.parseServerResponse_, this, callback),
      goog.bind(this.handleError_, this));
};


/**
 * Gets an entity from the local cache.  If this entity does not exist in the
 *    client cache then an error is thrown.  So you must ensure that the cache
 *    is primed (Facade.query) prior to calling getEntity.
 *
 * @param {string} type The type of entity to query.
 * @param {number} id The ID of the entity to retreive.
 * @return {!pn.data.Entity} The entity with the specified id.
 */
pn.data.BaseFacade.prototype.getEntity = function(type, id) {
  goog.asserts.assert(goog.isString(type));
  goog.asserts.assert(goog.isNumber(id));

  return this.cache.getEntity(type, id);
};


/**
 * Creates an entity optimistically.  This is done by creating the entity in the
 *    local cache first and assigning a temporary ID.  This request is then
 *    sent to the server and if succeeds the client updates with the proper
 *    server ID.  Otherwise the client creation is rolled back.
 *
 * @param {!pn.data.Entity} entity The entity to create.
 * @return {!pn.data.Entity} The created entity with an assigned temporary ID
 *    which will change once the server is updated.
 */
pn.data.BaseFacade.prototype.createEntity = function(entity) {
  goog.asserts.assert(entity instanceof pn.data.Entity);
  goog.asserts.assert(entity.id <= 0);

  entity = this.cache.createEntity(entity).clone();
  var tmpid = entity.id;

  var onsuccess = goog.bind(function(entity2) {
    entity.id = entity2.id;
    goog.asserts.assert(entity.equals(entity2));

    this.cache.updateEntity(entity, tmpid);
  }, this);

  var onfail = goog.bind(function(error) {
    this.cache.deleteEntity(entity.type, tmpid);
    throw new Error(error);
  }, this);
  this.server.createEntity(entity, this.getLastUpdate(),
      goog.bind(this.parseServerResponse_, this, onsuccess),
      onfail);

  return entity;
};


/**
 * Updates an entity in the client cache then returns control. The update is
 *    then sent to the server.
 *
 * @param {!pn.data.Entity} entity The entity to update.
 */
pn.data.BaseFacade.prototype.updateEntity = function(entity) {
  goog.asserts.assert(entity instanceof pn.data.Entity);
  goog.asserts.assert(entity.id > 0);

  var current = this.cache.getEntity(entity.type, entity.id);

  this.cache.updateEntity(entity);

  var onsuccess = function(entity2) {
    goog.asserts.assert(entity.equals(entity2));
  };

  var onfail = goog.bind(function(error) {
    this.cache.updateEntity(current); // Revert client cache
    throw new Error(error);
  }, this);

  this.server.updateEntity(entity, this.getLastUpdate(),
      goog.bind(this.parseServerResponse_, this, onsuccess),
      onfail);
};


/**
 * @param {!pn.data.Entity} entity The entity to delete.
 */
pn.data.BaseFacade.prototype.deleteEntity = function(entity) {
  goog.asserts.assert(entity instanceof pn.data.Entity);
  goog.asserts.assert(entity.id > 0);

  var current = this.cache.getEntity(entity.type, entity.id);

  this.cache.deleteEntity(entity.type, entity.id);
  var onfail = goog.bind(function(error) {
    this.cache.undeleteEntity(current); // Revert client cache
    throw new Error(error);
  }, this);

  this.server.deleteEntity(entity, this.getLastUpdate(),
      goog.bind(this.parseServerResponse_, this),
      onfail);
};


/**
 * @param {!Array.<(pn.data.Query|string)>} queries The queries to execute.
 * @param {function(!Object.<!Array.<pn.data.Entity>>):undefined} callback The
 *    query results callback.  The reason this is a callback rather than a
 *    returned value is that this can be overriden. See LazyFacade for
 *    an example of this.
 */
pn.data.BaseFacade.prototype.query = function(queries, callback) {
  goog.asserts.assert(goog.isArray(queries) && queries.length > 0);
  goog.asserts.assert(goog.isFunction(callback));
  var parsed = goog.array.map(queries, function(q) {
    if (q instanceof pn.data.Query) return q;
    return new pn.data.Query(q);
  });
  this.queryImpl(parsed, callback);
};


/**
 * This is overriden by LazyFacade and allows the Lazy facade to only cache
 *    content once queried.
 *
 * @protected
 * @param {!Array.<(pn.data.Query)>} queries The queries to execute.
 * @param {function(!Object.<!Array.<pn.data.Entity>>):undefined} callback The
 *    query results callback.  The reason this is a callback rather than a
 *    returned value is that this can be overriden. See LazyFacade for
 *    an example of this.
 */
pn.data.BaseFacade.prototype.queryImpl = function(queries, callback) {
  goog.asserts.assert(goog.isArray(queries) && queries.length > 0);
  goog.asserts.assert(goog.isFunction(callback));

  callback(this.cache.query(queries));
};

////////////////////////////////////////////////////////////////////////////////
// PRIVATE HELPERS
////////////////////////////////////////////////////////////////////////////////


/**
 * @protected
 * This is protected so that LazyFacade can override this with a custom
 *    implementation.
 * @return {number} The last server time that the cache was updated.
 */
pn.data.BaseFacade.prototype.getLastUpdate = function() {
  return this.cache.lastUpdate;
};


/** @protected */
pn.data.BaseFacade.prototype.sync = function() {
  this.server.getAllUpdates(this.getLastUpdate(),
      goog.bind(this.parseServerResponse_, this),
      goog.bind(this.handleError_, this));
};


/** @private */
pn.data.BaseFacade.prototype.proxyServerEvents_ = function() {
  goog.object.forEach(pn.data.Server.EventType, function(et) {
    this.eh_.listen(this.server, et, this.dispatchEvent);
  }, this);
};


/** @private */
pn.data.BaseFacade.prototype.startUpdateInterval_ = function() {
  this.timerid_ = setInterval(goog.bind(this.sync, this), 20000);
};


/**
 * @private
 * @param {!(function((pn.data.Entity|Object)=):undefined|
 *    pn.data.Server.Response)} callbackOrResponse The success callback or
 *    the response object.
 * @param {pn.data.Server.Response=} opt_response The optional response
 *    object.  This is only allowed if the callbackOrResponse parameter
 *    is a function - a callback.
 */
pn.data.BaseFacade.prototype.parseServerResponse_ =
    function(callbackOrResponse, opt_response) {
  var callback = callbackOrResponse instanceof pn.data.Server.Response ?
      null : callbackOrResponse;
  var response = callbackOrResponse instanceof pn.data.Server.Response ?
      callbackOrResponse : opt_response;

  goog.asserts.assert(goog.isNull(callback) || goog.isFunction(callback));
  goog.asserts.assert(response instanceof pn.data.Server.Response);

  this.applyUpdates_(response.updates);

  if (callback) callback.call(this,
      response.responseEntity || response.ajaxData);
};


/**
 * @private
 * @param {string} error The error from the server.
 */
pn.data.BaseFacade.prototype.handleError_ = function(error) {
  goog.asserts.assert(goog.isString(error));

  throw new Error(error);
};


/**
 * @private
 * @param {!Array.<pn.data.Server.Update>} updates The updates since last
 *    update time.
 */
pn.data.BaseFacade.prototype.applyUpdates_ = function(updates) {
  goog.asserts.assert(goog.isArray(updates));

  goog.array.forEach(updates, this.applyUpdate_, this);
};


/**
 * @private
 * @param {!pn.data.Server.Update} update The update to update the cache
 *    with.
 */
pn.data.BaseFacade.prototype.applyUpdate_ = function(update) {
  goog.asserts.assert(update instanceof pn.data.Server.Update);

  switch (update.type) {
    case 'delete':
      this.cache.deleteEntity(update.entityType, update.id);
      break;
    case 'create':
      // undeleteEntity is basically an unverified push back into the entity
      // list so it bypasses all the createEntity checks, like ID should be 0.
      this.cache.undeleteEntity(/** @type {!pn.data.Entity} */ (update.entity));
      break;
    case 'update':
      this.cache.updateEntity(/** @type {!pn.data.Entity} */ (update.entity));
      break;
    default: throw new Error('Update: ' + update + ' is not supported');
  }
};


/** @override */
pn.data.BaseFacade.prototype.disposeInternal = function() {
  pn.data.BaseFacade.superClass_.disposeInternal.call(this);
  if (this.timer_ !== 0) clearInterval(this.timer_);
};


/** @enum {string} */
pn.data.BaseFacade.EventType = {
  LOADING: 'server-loading',
  LOADED: 'server-loaded'
};

