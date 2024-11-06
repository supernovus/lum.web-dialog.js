"use strict";

const core = require('@lumjs/core');
const {B} = core;
const Preset = require('./preset');
const {DOMListeners} = require('../symbols');
const ESC = 'Escape';

/*
 * Remember, `this` in these events refers to the
 * DialogHelper instance, not the AutoClosePreset instance!
 * If you need to refer to the preset, you need to define
 * the event handlers inside the `get events()` getter.
 */
const DIAG_EVENTS = Object.freeze(
{
  postShow()
  {
    const opts = this.autoClose;
  
    if (opts.enabled)
    {
      const dome = this[DOMListeners];
      const acb = dome.autoCloseBody = {};

      acb.click = ev => 
      {
        if (opts.clickPreventDefault ?? opts.preventDefault)
          ev.preventDefault();
        if (opts.clickStopPropagation ?? opts.stopPropagation)
          ev.stopPropagation();

        this.close();
      }
  
      if (!this.useModal && opts.nonModalEsc)
      { // Emulate modal 'Esc' behaviour in non-modal dialogs
        acb.keyup = ev => 
        {     
          if (ev.code === ESC)
          {
            if (opts.escPreventDefault ?? opts.preventDefault)
              ev.preventDefault();
            if (opts.escStopPropagation ?? opts.stopPropagation)
              ev.stopPropagation();

            this.close();
          }
        }
      }

      for (const ename in acb)
      {
        document.body.addEventListener(ename, acb[ename]);
      }
    }
  },

  postClose()
  {
    const dome = this[DOMListeners];
    if (dome.autoCloseBody)
    {
      const acb = dome.autoCloseBody;
      for (const ename in acb)
      {
        document.body.removeEventListener(ename, acb[ename]);
      }
      delete dome.autoCloseBody;
    }
  },

  autoClose$preSet(ev)
  {
    if (typeof ev.data.val === B)
    { // A shortcut to this.autoClose.enabled
      const aco = this.autoClose;
      aco.enabled = ev.data.val;
      ev.data.assign = false;
    }
  },

});

class AutoClosePreset extends Preset
{
  get dialogOptions() 
  { 
    return(
    [
      ['autoClose', {enabled: true}, {nestedOptions: true}],
    ]);
  }

  get events()
  {
    return DIAG_EVENTS;
  }
}

module.exports = AutoClosePreset;
