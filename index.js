// Install the JavaScript fatal-error recorder before Expo Router evaluates app routes.
// Keep this file CommonJS so the setup call runs before the router entry is required.
try {
  require('./features/support/crashReporting').installGlobalCrashHandler();
} catch {
  // A reporting failure must never prevent the app from starting.
}

require('expo-router/entry');

