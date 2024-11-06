"use strict";

const core = require('@lumjs/core');
const {S,isObj,def,isIterable} = core.types;
const WC = require('@lumjs/web-core');
const {reposition} = WC.ui;
const {find} = WC.query;
const {PresetsCache} = require('./symbols');
const SKIP_OPTS = ['presets','eventRegistry'];
const copy = Object.assign;

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
   * A shallow copy of the `opts` excluding certain reserved options
   * such as `.presets` will be saved as `this.options`
   * 
   * More options may be added by extensions/presets.
   * 
   * @param {boolean} [opts.useModal=false]  Use `elem.showModal()` to open?
   * @param {boolean} [opts.autoReset=false] Reset position when dialog closed?
   * @param {object}  [opts.repositionOpts]  Default reposition() options
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
    this.options = copy({}, opts);
    for (let skip of SKIP_OPTS)
    { // Remove constructor-only options
      delete this.options[skip];
    }

    const psc = new Map();
    def(this, PresetsCache, {value: psc});

    core.events.register(this, opts.eventRegistry);

    if (isIterable(opts.presets))
    { // Apply presets
      this.use(...opts.presets);
    }

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
   * Show the dialog
   * 
   * @param {(object|Event)} [opts] Options
   * 
   * If this is an `Event` instance, an implicit options object
   * will be created with the event set as the `opts.at` value.
   * 
   * Any other kind of object will be considered the explicit options.
   * 
   * The `opts` object (explicit or implicit) will be passed to
   * the emitted events as the sole (data) argument.
   * 
   * @param {(Event|module:@lumjs/web-dialog~Pos)} [opts.at]
   * Optional positioning data to move the dialog to a specific location.
   * 
   * Uses `ui.reposition()` from the `@lumjs/web-core` package.
   * 
   * If using an event, `MouseEvent`, `PointerEvent`, and `TouchEvent` 
   * are the only event types that are directly supported.
   * 
   * @param {object} [opts.reposition] Options for reposition()
   *
   * Defaults to `opts` itself if not explicitly specified.
   * 
   * Any options set here will override the defaults from 
   * `this.options.repositionOpts`
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

    if (this.options.useModal)
    {
      elem.showModal();
    }
    else
    {
      elem.show();
    }

    if (isObj(opts.at))
    { // Move it!
      const io = this.options;
      const ro = copy({}, io.repositionOpts, (opts.reposition ?? opts));
      reposition(elem, opts.at, ro);
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
   * @param {boolean} [opts.reset] Reset <dialog/> position?
   * Will default to `this.options.autoReset` if not specified.
   * 
   * @returns {module:@lumjs/web-dialog.Dialog} `this`
   * 
   * @emits module:@lumjs/web-dialog.Dialog#event:preClose
   * @emits module:@lumjs/web-dialog.Dialog#event:postClose
   */
  close(opts={})
  {
    const elem = this.element;
    const reset = !!(opts.reset ?? this.options.autoReset);

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

