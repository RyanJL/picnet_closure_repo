﻿
goog.provide('pn.data.Query');

goog.require('goog.asserts');
goog.require('pn.json');

/** 
 * @constructor
 * @param {string} type The entity type of this query.
 * @param {string=} opt_linq The optional linq query text to filter the query.
 */
pn.data.Query = function(type, opt_linq) {
  goog.asserts.assert(goog.isString(type));
  goog.asserts.assert(!goog.isDef(opt_linq) || goog.isString(opt_linq));

  /** 
   * @type {string}
   * @expose
   */
  this.Type = type;

  /** 
   * @type {string}
   * @expose
   */
  this.Linq = opt_linq || '';
};

/** @override */
pn.data.Query.prototype.toString = function() {
  var o = { 'Type': this.Type, 'Linq': this.Linq };
  return pn.json.serialiseJson(o);
};

/**
 * @param {string} str A string representation of a Query object.
 * @return {!pn.data.Query} The parsed query object.
 */
pn.data.Query.fromString = function(str) {
  goog.asserts.assert(goog.isString(str));

  var o = pn.json.parseJson(str);
  return new pn.data.Query(o['Type'], o['Linq']);
};