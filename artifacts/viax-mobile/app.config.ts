import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic Expo config — extends app.json with environment-conditional options.
 *
 * Goals:
 *   1. `usesCleartextTraffic` is enabled ONLY in the development build profile,
 *      so devs can hit `http://10.0.2.2:8080` (Android emulator → host) or a LAN
 *      IP. Preview/production builds force HTTPS, removing a Play Store / pentest
 *      finding.
 *   2. App version is single-sourced from `package.json`, so `eas build` and the
 *      runtime always agree (and EAS Update's `appVersion` runtime channel is
 *      consistent).
 *
 * `versionCode` is intentionally NOT set here: `eas.json` uses
 * `appVersionSource: "remote"` + `autoIncrement: true` on the production
 * profile, so EAS owns the integer build number.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const profile = process.env.EAS_BUILD_PROFILE;
  const isDev = profile === 'development' || (!profile && process.env.NODE_ENV !== 'production');

  // Inject expo-build-properties with a profile-aware Android block. We add it
  // here instead of app.json so cleartext is opt-in per build profile.
  const buildPropertiesPlugin: [string, Record<string, unknown>] = [
    'expo-build-properties',
    {
      android: {
        usesCleartextTraffic: isDev,
      },
    },
  ];
  const plugins: ExpoConfig['plugins'] = [
    ...(config.plugins ?? []),
    buildPropertiesPlugin,
  ];

  return {
    ...config,
    name: config.name ?? 'ViaX:Trace',
    slug: config.slug ?? 'workspace',
    version: require('./package.json').version,
    plugins,
  };
};
