
goog.require('goog.asserts');
goog.require('goog.string');

goog.provide('pn.convert');


/**
 * @param {number} cents The cents to display as a dollar/cents string.
 * @return {string} The dollar / cents string.
 */
pn.convert.centsToCurrency = function(cents) {
  goog.asserts.assert(goog.isNumber(cents));
  var actualDollars = Math.floor(cents / 100);
  var actualCents = Math.floor(cents % 100);
  return '$' + actualDollars + '.' + goog.string.padNumber(actualCents, 2);
};


/**
 * @param {string} currency The dollar / cents string.
 * @return {number} The cents value amount.
 */
pn.convert.currencyToCents = function(currency) {
  goog.asserts.assert(goog.isDefAndNotNull(currency));
  if (goog.isNumber(currency)) return /** @type {number} */ (currency);

  if (currency.indexOf('$') === 0) currency = currency.substring(1);
  var cents = parseInt(parseFloat(currency) * 100, 10);
  return cents;
};


/**
 * @param {string} time The 12 Hour format time (i.e. 06:00 AM).
 * @return {number} The number of minutes form 00:00.
 */
pn.convert.timeToMinutes = function(time) {
  goog.asserts.assert(goog.isDefAndNotNull(time));
  var hour = parseInt(time, 10);
  var minutes = parseInt(time.split(':')[1], 10);
  var isPm = goog.string.endsWith(time, 'PM');
  if (isPm) hour += 12;
  return (hour * 60) + minutes;
};
