/**
 * Adds what can't live in app.json. Android push (FCM) needs Firebase's google-services.json: it is uploaded to
 * expo.dev as a file environment variable GOOGLE_SERVICES_JSON (never committed), so builds without it still work.
 */
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    ...(process.env.GOOGLE_SERVICES_JSON ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON } : {}),
  },
});
