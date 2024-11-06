"use strict";

const core = require('@lumjs/core');
const {F,isObj,isIterable,isArray} = core.types;
const {PresetsCache} = require('../symbols');

/**
 * An abstract base class for Dialog Preset classes.
 * 
 * There is no specific constructor, but you can make your own
 * if really needed. The `apply()` method is the one that performs
 * the actual magic of adding behaviours to the Dialog instance.
 * 
 * There is a `@lumjs/web-dialog/presets.Preset` alias for this class.
 * 
 * @alias module:@lumjs/web-dialog.Preset
 */
class DialogPreset
{
  /**
   * Apply this preset to a dialog
   * 
   * Don't call this manually, use one of the following instead:
   * - {@link module:@lumjs/web-dialog.Dialog#use}
   * - {@link module:@lumjs/web-dialog/presets.use}
   * 
   * @param {module:@lumjs/web-dialog.Dialog} dialog 
   * @param {?module:@lumjs/web-dialog.Preset} [fromPreset=null]
   * Used if the preset is being included from another preset
   * 
   * @returns {module:@lumjs/web-dialog.Preset} `this`
   * @throws {RangeError} This instance has already been applied to a dialog
   * @throws {TypeError} The `dialog` value was not a valid instance
   */
  apply(dialog, fromPreset=null)
  {
    if (this.dialog instanceof DH)
    {
      console.error({dialog, preset: this});
      throw new RangeError("Preset instance is already registered");
    }

    if (!fromPreset && !(dialog instanceof DH))
    {
      throw new TypeError("Invalid Dialog instance");
    }

    const pc = dialog[PresetsCache];
    if (pc.has(this.constructor))
    {
      if (!fromPreset)
      {
        console.error("Dialog already uses Preset", {dialog, preset: this});
      }
      return this;
    }

    pc.set(this.constructor, this);

    this.dialog = dialog;
    this.viaPreset = fromPreset;

    let defs = this.dialogOptions;
    if (isIterable(defs))
    {
      for (const def of defs)
      {
        if (isArray(def))
        {
          dialog.addOption(...def);
        }
        else if (isObj(def))
        {
          dialog.addOption((def.names??def.name),def.default);
        }
        else
        {
          console.error("Unsupported option spec", {def, defs, preset: this});
        }
      }
    }

    defs = this.events;
    if (isObj(defs))
    {
      for (const name in defs)
      {
        const listener = defs[name];
        if (typeof listener === F)
        {
          dialog.on(name, listener);
        }
        else
        {
          console.error("Unsupported event listener", 
            {name, listener, defs, preset: this});
        }
      }
    }

    defs = this.includes;
    if (isIterable(defs))
    {
      const presets = require('./index');
      presets.use(this, ...defs);
    }

    this.setup();
    return this;
  }

  /**
   * May be an an array of arrays, each child array being used as
   * the arguments for a `dialog.addOption()` method call.
   */
  get dialogOptions()
  {
    return null;
  }

  /**
   * If set to a plain object, each property key will be the name of a
   * Dialog event, and each value much be a function that will be
   * assigned as a corresponding event listener.
   */
  get events()
  {
    return null;
  }

  /**
   * May be set to an array that if set will be used
   * as the `presets` argument in {@link module:@lumjs/web-dialog/presets.use},
   * while this Preset instance will be the `parent` argument.
   */
  get includes()
  {
    return null;
  }

  /**
   * An optional method called _after_ applying the preset.
   * @see module:@lumjs/web-dialog.Preset#apply
   */
  setup()
  {
    return;
  }

}

module.exports = DialogPreset;

const DH = require('../dialog');
