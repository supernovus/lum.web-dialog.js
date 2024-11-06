"use strict";

const Preset = require('./preset');
const {DOMListeners} = require('../symbols');
const ESC = 'Escape';

/*
 * Remember, `this` in these events refers to the
 * DialogHelper instance, not the AutoClosePreset instance!
 * If you need to refer to the preset, you need to define
 * the event handlers _inside_ the `get events()` getter.
 */
const DIAG_EVENTS = Object.freeze(
{
  postShow()
  {
    const dio = this.options;
    const aco = dio.autoClose;
  
    if (aco.enabled)
    {
      const dome = this[DOMListeners];
      const acb = dome.autoCloseBody = {};

      acb.click = ev => 
      {
        if (aco.clickPreventDefault ?? aco.preventDefault)
          ev.preventDefault();
        if (aco.clickStopPropagation ?? aco.stopPropagation)
          ev.stopPropagation();

        this.close();
      }
  
      if (!dio.useModal && aco.nonModalEsc)
      { // Emulate modal 'Esc' behaviour in non-modal dialogs
        acb.keyup = ev => 
        {     
          if (ev.code === ESC)
          {
            if (aco.escPreventDefault ?? aco.preventDefault)
              ev.preventDefault();
            if (aco.escStopPropagation ?? aco.stopPropagation)
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

});

/**
 * Enable this to automatically close the dialog when there is a 
 * click event anywhere on the page body.
 * 
 * All options will be set in a nested `dialog.options.autoClose`
 * object with the following supported:
 *
 * | Option                 | Default    | Description                      |
 * | ---------------------- | ---------- | -------------------------------- |
 * | `enabled`              | true       | Enable auto-close                |
 * | `nonModalEsc`          | false      | Esc key closes non-modal dialogs |
 * | `clickPreventDefault`  | see below  | click.preventDefault()           |
 * | `clickStopPropagation` | see below  | click.stopPropagation()          |
 * | `escPreventDefault`    | see below  | keyup[Escape].preventDefault()   |
 * | `escStopPropagation`   | see below  | keyup[Escape].stopPropagation()  |
 * | `preventDefault`       | false      | Default for `*PreventDefault`    |
 * | `stopPropagation`      | false      | Default for `*StopPropagation`   |
 * 
 * @alias module:@lumjs/web-dialog/presets.AutoClose
 */
class AutoClosePreset extends Preset
{
  get optionsPrefix()
  {
    return 'autoClose';
  }

  get options() 
  { 
    return {enabled: true};
  }

  get events()
  {
    return DIAG_EVENTS;
  }
}

module.exports = AutoClosePreset;
