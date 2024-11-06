"use strict";

module.exports =
{
  Dialog: require('./dialog'),
  Preset: require('./presets/preset'),
  presets: require('./presets'),
  SYMBOLS: require('./symbols'),
}

/**
 * Position object
 * 
 * May have other properties, but MUST have `x` and `y`.
 * 
 * @typedef {object} module:@lumjs/web-dialog~Pos
 * @prop {number} x - Horizontal coordinate
 * @prop {number} y - Vertical coordinate
 */
