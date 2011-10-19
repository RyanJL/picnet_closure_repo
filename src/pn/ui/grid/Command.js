﻿;
goog.provide('pn.ui.grid.Command');

goog.require('goog.events.Event');
goog.require('goog.events.EventHandler');
goog.require('goog.ui.Button');
goog.require('goog.ui.Component');
goog.require('pn.ui.grid.Grid.EventType');



/**
 * @constructor
 * @extends {goog.ui.Component}
 * @param {string} name The name/caption of this column.
 * @param {pn.ui.grid.Grid.EventType} eventType The event to fire on '
 *    componenet action.
 */
pn.ui.grid.Command = function(name, eventType) {
  goog.asserts.assert(name);
  goog.asserts.assert(eventType);

  goog.ui.Component.call(this);

  /**
   * @private
   * @type {string}
   */
  this.name_ = name;

  /**
   * @type {pn.ui.grid.Grid.EventType}
   */
  this.eventType = eventType;

  /**
   * @private
   * @type {goog.ui.Button}
   */
  this.commandElement_ = null;

  /**
   * @private
   * @type {!goog.events.EventHandler}
   */
  this.eh_ = new goog.events.EventHandler(this);
};
goog.inherits(pn.ui.grid.Command, goog.ui.Component);


/** @inheritDoc */
pn.ui.grid.Command.prototype.createDom = function() {
  this.decorateInternal(this.dom_.createElement('div'));
};


/** @inheritDoc */
pn.ui.grid.Command.prototype.decorateInternal = function(element) {
  this.setElementInternal(element);
  this.commandElement_ = new goog.ui.Button(this.name_);
  this.commandElement_.render(element);
};


/** @inheritDoc */
pn.ui.grid.Command.prototype.enterDocument = function() {
  this.eh_.listen(this.commandElement_, goog.ui.Component.EventType.ACTION,
      function() {
        this.dispatchEvent(new goog.events.Event(this.eventType, this));
      });
};


/** @inheritDoc */
pn.ui.grid.Command.prototype.exitDocument = function() {
  this.eh_.removeAll();
};


/** @inheritDoc */
pn.ui.grid.Command.prototype.disposeInternal = function() {
  goog.dispose(this.commandElement_);
  goog.dispose(this.eh_);
};