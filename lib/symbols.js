"use strict";

const PKG     = '@lumjs/web-dialog';
const DIALOG  = PKG+'.Dialog';
const PRESETS = PKG+'/presets';

module.exports = 
{
  PresetsIndex: Symbol(PRESETS+'<Index>'),
  PresetsCache: Symbol(DIALOG+'<Presets>'),
  KnownOptions: Symbol(DIALOG+'<Options>'),
}
