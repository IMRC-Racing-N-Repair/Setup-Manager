# IMRC Setup Manager Website

Website development lives on the `website-new-look` branch. Mobile production and testing remain on their existing branches.

## Local website preview

```powershell
git fetch origin
git switch website-new-look
git pull --ff-only origin website-new-look
npm ci
npm run web
```

Expo will open the website locally. Press `w` from a normal Expo session if needed.

## Production export

```powershell
npm run web:export
npm run web:serve
```

The production website is written to `dist/`.

## First hosted preview

This Expo project is already connected to EAS. After verifying the local export:

```powershell
npx eas-cli@latest whoami
npx eas-cli@latest deploy
```

Use a preview name such as `imrc-setup-manager`. Do not promote to production until the website layout and sync are tested.

## Custom domain goal

Production domain: `setupmanager.shopimrc.com`

After a production deployment is approved:

1. Promote the tested deployment to production in the Expo dashboard.
2. Open the project's Hosting settings.
3. Assign `setupmanager.shopimrc.com` as the custom domain.
4. Add the verification, SSL, and CNAME records shown by Expo to the DNS provider for `shopimrc.com`.
5. Add `setupmanager.shopimrc.com` to Firebase Authentication's authorized domains.

Expo custom domains require an eligible paid Expo plan. If that is not desired, the same `dist/` export can be hosted through another provider without changing the app.
