"use strict";

const core = require('@lumjs/core');
const {S,O,isObj,def,isIterable} = core.types;
const WC = require('@lumjs/web-core');
const {reposition} = WC.ui;
const {find} = WC.query;
const {PresetsCache,KnownOptions} = require('./symbols');
const SKIP_OPTS = ['presets'];
const lock = Object.freeze;
const copy = Object.assign;

const DEFAULT_RULES =
{
  nestedOptions: false,
  cloneObject: null,
  valid(val)
  {
    if (this.nestedOptions)
    { // not using isObj() as `null` is a valid value here
      return (typeof val === O);
    }
    else
    {
      return (val !== undefined);
    }
  },
}

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
   * 
   * @param {Array} [opts.presets] Will be used as arguments
   * {@link module:@lumjs/web-dialog.Dialog#use use()} method.
   * See that method for details on valid item values.
   * 
   * @emits module:@lumjs/web-dialog.Dialog#event:constructed
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
    this.options = {};

    def(this, KnownOptions, 
    {
      props: new Set(),
      aliases:  {},
      defaults: {},
      rules:    {},
    });

    const psc = new Map();
    def(this, PresetsCache, {value: psc});

    core.events.register(this, opts.eventRegistry);

    this.addOption(['useModal',  'modal'], false);
    this.addOption(['autoReset', 'reset'], false);

    if (isIterable(opts.presets))
    { // Apply presets
      this.use(...opts.presets);
    }

    // Now we can set the rest of the options
    this.setOptions(opts);

    // Finally we can emit the constructed event
    this.emit('constructed');
  }

  /**
   * Apply a bunch of presets to this Dialog instance
   * @param {...(string|function|module:@lumjs/web-dialog.Preset)} presets
   * See {@link module:@lumjs/web-dialog/presets.use} for details
   * @returns {module:@lumjs/web-dialog.Dialog} `this`
   * @emits module:@lumjs/web-dialog.Dialog#event:used
   */
  use()
  {
    const allPresets = require('./presets');
    allPresets.use(this, ...arguments);
    this.emit('used');
    return this;
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
   * takes priority over any aliases), and return the first value
   * that passes the validation test, or the `defval` argument if 
   * no passing options were found.
   * 
   * The getter property will have an associated event called `${name}$get`
   * (the property name followed by the literal string `$get`) that can
   * update `event.data.val` to change the option value if required. 
   * 
   * If there is more than one listener, they can check `event.data.changed`
   * (which is a read-only getter) to see if a previous listener changed
   * the value.
   * 
   * The setter property will have TWO associated events:
   * 
   * - `${name}$preSet` → Called before `this.options[name]` is updated;
   *   can read/write the `event.data.val` property to override the value
   *   that will be assigned. If the `event.data.assign` property is set to 
   *   `false`, then the setter will not assign the new value at all.
   * - `${name}$postSet` → Called after `this.options[name]` has been updated;
   *   has the exact same `event.data` as the preSet event.
   * 
   * Both getter and setter events have a few read-only data properties:
   * - `default` → the default value defined here (see `defval` argument).
   * - `initial` → the option value before any event listeners were called.
   * - `rules`   → the `rules` argument passed to this method.
   * 
   * @param {*} [defval] A default value if option is not set
   * 
   * @param {object} [rules] Advanced rules for option behaviours
   * 
   * A read-only copy of the fully composed rules will be available in all 
   * getter/setter events as the `event.data.rules` property.
   * 
   * @param {boolean} [rules.nestedOptions=false] If `true` then this
   * is actually a set of nested options that will be another object,
   * which changes the default validation test, and the behaviour
   * of the setter property.
   * 
   * The setter will be changed so that if an object is assigned,
   * the properties of that object will be merged with the existing
   * nested options rather than overwriting them.
   * 
   * Additionally, setting the explicit value `null` will force the
   * object to be reset to the default value (assuming `.cloneObject`
   * wasn't set to `false`, which is highly discouraged if this
   * option is `true`).
   * 
   * @param {?boolean} [rules.cloneObject=null] If this is `true` 
   * and the `defval` is an object, then the initial value set to 
   * `this.options` will be a shallow clone of the default value 
   * rather than the default value itself.
   * 
   * If this rule is set to `null` (the default), then it
   * will fall back to the value of the `.nestedOptions` rule.
   * 
   * @param {function} [rules.valid] A test for valid option values
   * 
   * The default test is for any value other than `undefined`,
   * unless `.nestedOptions` is `true`, where values must be an object.
   * 
   * @returns {module:@lumjs/web-dialog.Dialog} `this`
   */
  addOption(names, defval, rules)
  {
    const oo = this[KnownOptions];
    let pname;

    if (Array.isArray(names))
    { // The first name will be primary
      pname = names[0];
      for (let i=1; i < names.length; i++)
      {
        if (SKIP_OPTS.includes(names[i]))
        {
          console.error("skipping reserved option alias", 
            {name: names[i], names, dialog: this});
          continue;
        }
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
      console.error({names, dialog: this});
      throw new TypeError("Invalid option names");
    }

    if (SKIP_OPTS.includes(pname))
    {
      console.error("cannot use reserved option property name",
        {name: pname, names, dialog: this});
      return this;
    }

    oo.defaults[pname] = defval;
    rules = oo.rules[pname] = lock(copy({}, DEFAULT_RULES, rules));

    if ((rules.cloneObject ?? rules.nestedOptions) && isObj(defval))
    { 
      defval = copy({}, defval);
    }

    this.options[pname] = defval;

    if (oo.props.has(pname))
    { // Option alreay registered
      return this;
    }

    oo.props.add(pname);

    // Set up a spec object with common properties
    const spec = (obj, initial) => 
    {
      def(obj, 'rules',   {value: oo.rules[pname]});
      def(obj, 'default', {value: oo.defaults[pname]});
      def(obj, 'initial', {value: initial});
    }

    function get()
    {
      const so = spec(
      {
        get changed()
        {
          return (this.val !== this.initial);
        }
      }, this.options[pname]);

      so.val = so.initial;
      
      this.emit(pname+'$get', so, oo);

      return so.val;
    }

    function set(val)
    {
      const so = spec(
      {
        val,
        assign: true,
      }, this.options[pname]);

      this.emit(pname+'$preSet', so, oo);

      if (so.assign)
      {
        if (so.rules.valid(so.val, so))
        {
          if (so.rules.nestedOptions)
          {
            if (so.val === null)
            { // Reset to default
              const defval = (so.rules.cloneObject ?? true)
                ? copy({}, so.default)
                : so.default;
              so.val = defval;
            }
            else
            {
              so.val = copy(so.initial, so.val);
            }
          }

          // Now assign the new value
          this.options[pname] = so.val;
        }
        else
        {
          so.invalid = true;
          console.error("invalid option value", 
            {data: so, name: pname, names, dialog: this});
        }
      }

      this.emit(pname+'$postSet', so, oo);
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
      if (SKIP_OPTS.includes(opt))
      { // Skip any protected/reserved options
        continue;
      }

      if (opt in oo.aliases)
      { // it's an alias
        opt = oo.aliases[opt];
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

