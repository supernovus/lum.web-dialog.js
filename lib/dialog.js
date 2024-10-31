"use strict";

const core = require('@lumjs/core');
const {S,isObj,def,isIterable} = core.types;
const WC = require('@lumjs/web-core');
const {reposition} = WC.ui;
const {find} = WC.query;
const {PresetsCache,KnownOptions} = require('./symbols');

/**
 * A really simple helper class for working with <dialog/> elements
 * 
 * @alias module:@lumjs/web-dialog.Dialog
 */
class DialogHelper
{
  /**
   * Create a new dialog helper
   * @param {(HTMLDialogElement|string)} elem - <dialog/> element;
   * or a query selector string that resolves to one
   * 
   * @param {object} [opts] Options
   * 
   * The primary option name will also exist as a getter/setter property
   * that should be used if you need to change the options after
   * construction. Aliases do not have corresponding properties.
   * 
   * More options may be added by extensions/presets.
   * 
   * @param {boolean} [opts.useModal=false] Use `elem.showModal()` to open?
   * @param {boolean} [opts.autoReset=false] Reset position when dialog closed?
   * @param {boolean} [opts.modal] An alias for `useModal`
   * @param {boolean} [opts.reset] An alias for `autoReset`
   */
  constructor(elem, opts={})
  {
    if (typeof elem === S)
    { // Assume it's a selector string
      elem = find(elem, false);
    }

    if (!(elem instanceof HTMLDialogElement))
    {
      console.error({elem, arguments});
      throw new TypeError("Invalid <dialog/> element");
    }

    this.element = elem;
    this.options = opts;

    def(this, KnownOptions, 
    {
      props: new Set(),
      aliases:  {},
      defaults: {},
    });

    def(this, PresetsCache, {value: new Map()});

    core.events.register(this, opts.eventRegistry);

    this.addOption(['useModal',  'modal'], false);
    this.addOption(['autoReset', 'reset'], false);

    if (isIterable(opts.presets))
    {
      this.use(...opts.presets);
    }
  }

  /**
   * Apply a bunch of presets to this Dialog instance
   * @param {...(string|function|module:@lumjs/web-dialog.Preset)} presets
   * See {@link module:@lumjs/web-dialog/presets.use} for details
   * @returns {module:@lumjs/web-dialog.Dialog} `this`
   */
  use()
  {
    const presets = require('./presets');
    return presets.use(this, ...arguments);
  }

  /**
   * Add additional options with corresponding properties;
   * this is meant for use by presets/extensions only.
   * 
   * @param {(string|string[])} names - One or more option names;
   * if this is an array, the first will be used as the primary name,
   * and any additional names will be used as aliases.
   * 
   * The primary option name will have a getter/setter property added
   * that should be used if you need to change the options after
   * construction. Aliases do not have corresponding properties.
   * 
   * The getter property will look for each name in `this.options`
   * in the order specified (thus the primary option name always
   * takes priority over any aliases), and return the first non-undefined
   * value found, or the `defval` argument if none were found.
   * 
   * The getter property will have two associated events:
   * - `preGet:${name}` → Called before `this.options` is checked for values;
   *   if an event handler sets `event.data.val` to something other than the
   *   `defval` value, then `this.options` will NOT be searched for values.
   * - `postGet:${name}` → Called after `this.options` has been checked;
   *   in addition to `event.data.val` containing the value that will be
   *   returned, this may use `event.data.changed` (a read-only getter) 
   *   to see if a non-default value was set.
   * 
   * The setter property will have two associated events:
   * - `preSet:${name}` → Called before `this.options[name]` is updated;
   *   can read/write the `event.data.val` property to override the value
   *   that will be assigned.
   * - `postSet:${name}` → Called after `this.options[name]` has been updated
   * 
   * @param {*} [defval] A default value if option is not set.
   * 
   * @returns {module:@lumjs/web-dialog.Dialog} `this`
   */
  addOption(names, defval)
  {
    const oo = this[KnownOptions];
    let pname;

    if (Array.isArray(names))
    { // The first name will be primary
      pname = names[0];
      for (let i=1; i < names.length; i++)
      {
        oo.aliases[names[i]] = pname;
      }
    }
    else if (typeof names === S)
    {
      pname = names;
      names = [pname];
    }
    else
    {
      throw new TypeError("Invalid option names", {names, dialog: this});
    }

    oo.defaults[pname] = defval;

    if (oo.props.has(pname))
    { // Option alreay registered
      return this;
    }

    oo.props.add(pname);

    function get()
    {
      const defval = oo.defaults[pname];
      const so = 
      {
        val: defval,
        get changed()
        {
          return (this.val !== defval);
        },
      }

      this.emit('preGet:'+pname, so, oo);

      if (!so.changed)
      {
        for (let name of names)
        {
          if (this.options[name] !== undefined)
          {
            so.val = this.options[name];
            break;
          }
        }
      }

      this.emit('postGet:'+pname, so, oo);

      return so.val;
    }

    function set(val)
    {
      const so = {val};
      this.emit('preSet:'+pname, so, oo);
      this.options[pname] = so.val;
      this.emit('postSet:'+pname, so, oo);
    }

    def(this, pname, {get, set});
    
    return this;
  }

  /**
   * Set multiple options
   * @param {object} opts - Options to set
   * 
   * The options specified here may use the primary option
   * names, or alias names. 
   * 
   * If an option is one registered with `addOption()` 
   * then the setter property will be used to update its value.
   * Otherwise it will be assigned to `this.options` directly.
   * 
   * @returns {module:@lumjs/web-dialog.Dialog} `this`
   */
  setOptions(opts)
  {
    const oo = this[KnownOptions];
    for (let opt in opts)
    {
      if (opt in oo.aliases)
      { // it's an alias
        opt = this.$aliases[opt];
      }

      if (oo.props.has(opt))
      { // Use the setter to set the option
        this[opt] = opts[opt];
      }
      else
      { // Not a registered option, set it directly
        this.options[opt] = opts[opt];
      }
    }
    return this;
  }

  /**
   * Show the dialog
   * 
   * @param {(object|Event)} [opts] Options
   * 
   * If this is an `Event` instance, it will be used as the
   * `opts.at` option value.
   * 
   * The `opts` object (after any remapping) will be passed to
   * the emitted events as the sole (data) argument.
   * 
   * @param {Event} [opts.at] An event object that will be used
   * to get the position to open the modal dialog at.
   * 
   * `MouseEvent`, `PointerEvent`, or `TouchEvent` are supported.
   * 
   * @returns {module:@lumjs/web-dialog.Dialog} `this`
   * 
   * @emits module:@lumjs/web-dialog.Dialog#event:preShow
   * @emits module:@lumjs/web-dialog.Dialog#event:postShow
   */
  show(opts={})
  {
    const elem = this.element;

    if (opts instanceof Event)
    {
      opts = {at: opts};
    }

    this.emit('preShow', opts);

    if (this.useModal)
    {
      elem.showModal();
    }
    else
    {
      elem.show();
    }

    if (isObj(opts.at))
    { // Move it!
      reposition(elem, opts.at, opts);
    }

    this.emit('postShow', opts);

    return this;
  }

  /**
   * Show the dialog [alias to show()]
   * @see module:@lumjs/web-dialog.Dialog#show
   * @returns {module:@lumjs/web-dialog.Dialog} `this`
   */
  open()
  {
    return this.show(...arguments);
  }

  /**
   * Close the dialog
   * 
   * @param {object} [opts] Options
   * 
   * The `opts` object  will be passed directly to
   * the emitted events as the sole (data) argument.
   * 
   * @param {boolean} [opts.reset=this.autoReset] Reset <dialog/> position?
   * 
   * @returns {module:@lumjs/web-dialog.Dialog} `this`
   * 
   * @emits module:@lumjs/web-dialog.Dialog#event:preClose
   * @emits module:@lumjs/web-dialog.Dialog#event:postClose
   */
  close(opts={})
  {
    const elem = this.element;
    const reset = opts.reset ?? this.autoReset;

    this.emit('preClose', opts);

    elem.close();

    if (reset)
    {
      elem.style = null;
    }

    this.emit('postClose', opts);

    return this;
  }

  /**
   * Close the dialog [alias to close()]
   * @see module:@lumjs/web-dialog.Dialog#close
   * @returns {module:@lumjs/web-dialog.Dialog} `this`
   */
  hide()
  {
    return this.close(...arguments);
  }

  /**
   * alias getter → `this.element.open`
   */
  get isOpen()
  {
    return this.element.open;
  }

}

module.exports = DialogHelper;

