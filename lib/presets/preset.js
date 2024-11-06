"use strict";

const core = require('@lumjs/core');
const {F,isObj,isIterable} = core.types;
const {setObjectPath} = core.obj;
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

    let defs = this.options;
    if (isObj(defs))
    {
      let ns = this.optionsPrefix.trim();
      if (ns !== '' && !ns.endsWith('.'))
      {
        ns += '.';
      }

      for (let path in defs)
      {
        setObjectPath(dialog.options, ns+path, 
        {
          value: defs[path],
          assign: true,
        });
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
   * If set to a plain object, it will be used as the _default values_
   * for options specific to this preset. 
   * 
   * Each property key will be used as a dotted _option path_ to set.
   * Uses `setObjectPath()` from `@lumjs/core` to set the options.
   * 
   * Regardless of when the preset is applied, these options will never 
   * override ones set explicitly in the dialog constructor.
   */
  get options()
  {
    return null;
  }

  /**
   * If all options are in a nested object then you can set the
   * prefix here, and it will be prepended to all the option paths
   * in the `options` getter automatically.
   */
  get optionsPrefix()
  {
    return '';
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
