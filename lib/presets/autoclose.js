"use strict";

const Preset = require('./preset');

class AutoClosePreset extends Preset
{
  
}

module.exports = AutoClosePreset;



// Remove this once presets are finished
const temp = 
{
  set autoClose(on)
  {
    const dh = this;
    if (on && !this.$autoCloseListener)
    {
      let fn;
      if (this.useModal)
      { // Modal dialog is easy.
        fn = function(ev)
        {
          if (ev.target.nodeName === 'DIALOG')
          {
            dh.close();
          }
        }
      }
      else
      {

      }
      this.$autoCloseListener = fn;
      this.element.addEventListener('click', fn);
    }
    else if (!on && this.$autoCloseListener)
    {
      this.element.removeEventListener('click', this.$autoCloseListener);
      delete this.$autoCloseListener;
    }
  }
}
