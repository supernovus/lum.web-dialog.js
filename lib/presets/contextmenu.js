"use strict";

const Preset = require('./preset');
const AutoClose = require('./autoclose');

class ContextMenuPreset extends Preset
{
  get includes()
  {
    return [AutoClose];
  }

  setup()
  {

  }
}

module.exports = ContextMenuPreset;
