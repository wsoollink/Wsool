// Lets Android lay the app out right-to-left in Arabic (the app switches with I18nManager.forceRTL).
const { withAndroidManifest, AndroidConfig } = require("expo/config-plugins");

module.exports = (config) =>
  withAndroidManifest(config, (c) => {
    AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults).$["android:supportsRtl"] = "true";
    return c;
  });
