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
    const dlg = this.dialog;
    dlg.autoReset = true;
    dlg.useModal = false;
    dlg.autoClose.nonModalEsc = true;
  }
}

module.exports = ContextMenuPreset;
