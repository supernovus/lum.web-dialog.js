"use strict";

const PKG    = '@lumjs/web-dialog';
const DIALOG = PKG+'.Dialog';
const PRESET = PKG+'.Preset';

module.exports = 
{
  PresetsCache: Symbol(DIALOG+'<Presets>'),
  PresetsIndex: Symbol(PRESET+'<Index>'),
  DOMListeners: Symbol(PRESET+'<DOMEvents>'),
}
