
goog.provide('pn.mvc.Model');

goog.require('pn.mvc.ModelBase');



/**
 * @constructor
 * @extends {pn.mvc.ModelBase}
 * @param {Object=} opt_initialValues The optional initial existing values
 *    of the model.  These do not trigger a change event.
 */
pn.mvc.Model = function(opt_initialValues) {
  pn.mvc.ModelBase.call(this);

  /**
   * @private
   * @type {!Object.<*>}
   */
  this.values_ = opt_initialValues || {};
};
goog.inherits(pn.mvc.Model, pn.mvc.ModelBase);


/**
 * @param {string} name The property name of the prop to retreive.
 * @return {*} The value of the specified property.
 */
pn.mvc.Model.prototype.get = function(name) {
  return this.values_[name];
};


/**
 * @param {string} name The name of the property to set.
 * @param {*} val The new value of the property to set.
 */
pn.mvc.Model.prototype.set = function(name, val) {
  var old = this.values_[name];
  if (this.same(old, val)) return;
  this.values_[name] = val;
  this.queueChange(name, old, val);
};


/**
 * @param {!Object} obj An object with all the property names and values
 *    to set.  This immediatelly calls fire() methods to inform all observers
 *    of the changes to this model.
 */
pn.mvc.Model.prototype.setAll = function(obj) {
  pn.assObj(obj);

  goog.object.forEach(obj, this.set.pnflip(), this);
  this.fire();
};
