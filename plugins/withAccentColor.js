const { AndroidConfig, withAndroidColors, withAndroidColorsNight, withAndroidStyles } = require('expo/config-plugins');

/**
 * Android paints system dialogs (the "Delete?" confirm) and the text cursor in the theme's accent,
 * which is teal by default. This sets it to the app's ink: near-black in light mode, near-white in dark.
 */
const NAME = 'labelLensAccent';

module.exports = function withAccentColor(config, { light = '#141414', dark = '#F2F3F5' } = {}) {
  config = withAndroidColors(config, (mod) => {
    mod.modResults = AndroidConfig.Colors.assignColorValue(mod.modResults, { name: NAME, value: light });
    return mod;
  });
  config = withAndroidColorsNight(config, (mod) => {
    mod.modResults = AndroidConfig.Colors.assignColorValue(mod.modResults, { name: NAME, value: dark });
    return mod;
  });
  return withAndroidStyles(config, (mod) => {
    mod.modResults = AndroidConfig.Styles.assignStylesValue(mod.modResults, {
      add: true,
      parent: AndroidConfig.Styles.getAppThemeGroup(),
      name: 'colorAccent',
      value: `@color/${NAME}`,
    });
    return mod;
  });
};
