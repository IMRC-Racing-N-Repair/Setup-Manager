# IMRC 2.1.10 clean iOS build

This build adds JavaScript startup crash capture and a one-tap **Send Crash Report** email draft.

## Required clean EAS build

Do not copy this version over an existing `ios`, `android`, or `node_modules` directory and reuse those generated files.

From the project folder, run:

```powershell
npm run clean:generated
npm ci
npm run doctor
npx expo export --platform ios --clear
npx eas-cli build --platform ios --profile production --clear-cache
```

The EAS profile pins Node.js 22.13.0. The package accepts npm 10 or 11; an npm upgrade is not required for this fix.

## What the report can capture

- JavaScript module-load, render, and global errors
- App version and native build number
- iOS version and React Native architecture
- JavaScript and React component stacks when available

The user still reviews the email and taps **Send**. iOS does not permit an app to silently send mail.

If the process exits before the `Starting IMRC...` screen appears, the failure is in native startup before JavaScript can report it. Retrieve the iOS crash log from Xcode Devices and Simulators, TestFlight/App Store Connect diagnostics, or iPhone Analytics Data and send the `.ips` report to IMRC.

