﻿;
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.i18n.DateTimeFormat');
goog.require('goog.i18n.DateTimeParse');
goog.require('goog.json');
goog.require('goog.string');

goog.provide('pn.Utils');


/**
 * @param {string} id The element ID.
 * @return {!Element} the element with the specified ID.
 */
pn.Utils.getElement = function(id) {
  goog.asserts.assert(id);
  var e = goog.dom.getElement(id);
  if (!e) throw new Error('Could not find the DOM element with ID: ' + id);
  return /** @type {!Element} */ (e);
};


/**
 * @private
 * @type {string}
 */
pn.Utils.datePattern_ = "dd'/'MMM'/'yyyy";


/** @type {!goog.i18n.DateTimeFormat} */
pn.Utils.dateFormat =
    new goog.i18n.DateTimeFormat(pn.Utils.datePattern_);


/** @type {!goog.i18n.DateTimeParse} */
pn.Utils.dateParser =
    new goog.i18n.DateTimeParse(pn.Utils.datePattern_);


/**
 * @param {!Object|undefined} o The object to test for array'ness'.
 * @return {boolean} Wether the specified object is an array.
 */
pn.Utils.isArray = function(o) {
  return (o instanceof Array) ||
      Object.prototype.toString.apply(o) === '[object Array]';
};


/**
 * @param {string?} json The json string to parse.
 * @return {Object|string} The parsed object.
 */
pn.Utils.parseJson = function(json) {
  if (!json || typeof(json) !== 'string') return json;
  var jsonDateSafe =
      json.replace(/\"\\\\\/Date\((\d+)\)\\\\\/\"/g, 'new Date($1)');
  return jsonDateSafe ? goog.json.unsafeParse(jsonDateSafe) : null;
};


/**
 * @param {Object} o The object to serialise to JSON.
 * @return {string} The string (json) representation of the specified object.
 */
pn.Utils.serialiseJson = function(o) {
  return goog.isDefAndNotNull(o) ? window['JSON']['stringify'](o) : '';
};


/**
 * @param {*} val The value to check for 'nullness'.
 * @return {boolean} Wether the value is null.
 */
pn.Utils.isNull = function(val) {
  if (val === false) return false;
  if (!goog.isDefAndNotNull(val)) return true;
  if (goog.isString(val)) return !goog.string.trim(val);
  if (val.getFullYear && val.getFullYear() <= 1970) { return true; }
  return false;
};


/**
 * @return {string} The date's json string.
 * @this {Date}
 */
Date.prototype['toJSON'] = function() {
  return '\\/Date(' + this.getTime() + ')\\/';
};