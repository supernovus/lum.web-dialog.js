/**
 * Behaviour presets for Dialog helper class.
 * 
 * This module is also available as `@lumjs/web-dialog.presets`
 * 
 * @module @lumjs/web-dialog/presets
 */
"use strict";

const core = require('@lumjs/core');
const {def,F,S} = core.types;
const Preset = require('./preset');
const {PresetsIndex: Index} = require('../symbols');
const SUFFIX = /Preset$/;
const presets = {};

exports.Preset = Preset;
def(exports, Index, {value: presets});

/**
 * Add a preset class to this registry
 * 
 * @param {function} presetClass - Class constructor;
 * this class MUST extend {@link module:@lumjs/web-dialog.Preset}
 * 
 * @param {string} [cname] Optional class name to use
 * 
 * If not specified, the `presetClass.name` will be used after
 * removing a trailing `Preset` suffix (if found).
 * 
 * The property name assigned to the _exports_ is case-sensitive,
 * but you can use {@link module:@lumjs/web-dialog/presets.get get()}
 * to look it up as a case-insensitive name.
 * 
 * @throws {TypeError} If `presetClass` is not valid
 * @throws {RangeError} If any case-insensitive version of `cname`
 * has already been registered, or is a reserved identifier.
 * 
 * @alias module:@lumjs/web-dialog/presets.add
 */
function add(presetClass, cname)
{
  const t =
  {
    isaPreset: Preset.isPrototypeOf(presetClass),
    baseClass: Preset,
    presetClass,
  }

  if (!t.isaPreset)
  {
    console.error(t);
    throw new TypeError("Invalid Preset class constructor");
  }

  if (typeof cname !== S || cname.trim() === '')
  {
    cname = presetClass.name.replace(SUFFIX, '');
  }

  if (exports[cname] !== undefined)
  {
    throw new RangeError(cname+" already exported");
  }

  const pname = cname.toLowerCase();

  if (presets[pname] !== undefined)
  {
    throw new RangeError(pname+" already registered (case-insensitive)");
  }

  exports[cname] = presetClass;
  presets[pname] = presetClass;
}
exports.add = add;

/**
 * Look up a preset class using a case-insensitive name
 * @param {string} name - Name of the preset to get
 * 
 * Any case-insensitive variation on the class name should work.
 * So for example, `AutoClose`, `Autoclose`, `autoClose`, `autoclose`
 * will all return the `presets.AutoClose` class constructor.
 * 
 * @returns {?function} Class constructor if found, or `null` otherwise
 * @throws {TypeError} If `name` is not a string, or is only whitespace
 * @alias module:@lumjs/web-dialog/presets.get
 */
exports.get = function(name)
{
  if (typeof name !== S || name.trim() === '')
  {
    console.error({name});
    throw new TypeError("Invalid name");
  }

  name = name.toLowerCase();
  return presets[name] ?? null;
}

/**
 * Use a bunch of presets
 * 
 * @param {(module:@lumjs/web-dialog.Dialog|module:@lumjs/web-dialog.Preset)} parent
 * Usually the Dialog instance to apply the presets to .
 * 
 * If the presets are being registered via another preset, then that
 * preset will be specified here.
 * 
 * @param  {...(string|function|module:@lumjs/web-dialog.Preset)} presets 
 * 
 * - `string` → {@link module:@lumjs/web-dialog/presets.get get(val)}
 * - `function` → Must be a valid `Preset` sub-class constructor
 * - `object` → Must be an instance of a `Preset` sub-class
 * 
 * @returns {module:@lumjs/web-dialog.Dialog} The dialog
 * @throws {TypeError} If a value in `presets` is invalid
 * @alias module:@lumjs/web-dialog/presets.use
 */
exports.use = function(parent, ...presets)
{
  const fromPreset = (parent instanceof Preset);
  const dialog = fromPreset ? parent.dialog : parent;

  for (const ps of presets)
  {
    let preset = ps;

    if (typeof preset === S)
    {
      preset = exports.get(preset);
    }

    if (typeof preset === F && Preset.isPrototypeOf(preset))
    {
      preset = new Preset();
    }
    else if (!(preset instanceof Preset))
    {
      console.error({ps, preset, exports, arguments});
      throw new TypeError("Invalid Preset instance");
    }

    preset.apply(dialog, fromPreset ? parent : null);
  }

  return dialog;
}

add(require('./autoclose'));
add(require('./contextmenu'));
