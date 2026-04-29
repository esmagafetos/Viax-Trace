import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';

import 'api/api_client.dart';
import 'router.dart';
import 'screens/splash.dart';
import 'services/haptics.dart';
import 'state/auth_provider.dart';
import 'state/foreground_processing.dart';
import 'state/processing_service.dart';
import 'state/settings_provider.dart';
import 'state/theme_provider.dart';
import 'theme/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  ForegroundProcessing.initialize();
  await initializeDateFormatting('pt_BR', null);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
  ));

  final api = ApiClient();
  await api.init();

  final themeProv = ThemeProvider();
  await themeProv.load();

  await AppHaptics.load();

  runApp(ViaXApp(api: api, themeProv: themeProv));
}

class ViaXApp extends StatelessWidget {
  final ApiClient api;
  final ThemeProvider themeProv;
  const ViaXApp({
    super.key,
    required this.api,
    required this.themeProv,
  });

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiClient>.value(value: api),
        ChangeNotifierProvider<ThemeProvider>.value(value: themeProv),
        ChangeNotifierProvider(create: (_) => AuthProvider(api)..bootstrap()),
        ChangeNotifierProvider(create: (_) => SettingsProvider(api)),
        ChangeNotifierProvider(create: (_) => ProcessingService()),
      ],
      child: Consumer2<AuthProvider, ThemeProvider>(
        builder: (context, auth, theme, _) {
          final router = createRouter(auth);
          return MaterialApp.router(
            title: 'ViaX:Trace',
            debugShowCheckedModeBanner: false,
            theme: buildTheme(Brightness.light),
            darkTheme: buildTheme(Brightness.dark),
            themeMode: theme.mode,
            routerConfig: router,
            builder: (ctx, child) {
              // While the auth bootstrap is in flight (cold start can take
              // 30-60s on Render free tier), hold a branded splash so the
              // app opens linearly instead of flashing login → dashboard.
              final body = auth.loading
                  ? const SplashScreen()
                  : (child ?? const SizedBox.shrink());
              return MediaQuery(
                data: MediaQuery.of(ctx).copyWith(textScaler: const TextScaler.linear(1.0)),
                child: DefaultTextStyle.merge(
                  style: GoogleFonts.poppins(),
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 280),
                    switchInCurve: Curves.easeOutCubic,
                    switchOutCurve: Curves.easeInCubic,
                    child: KeyedSubtree(
                      key: ValueKey<bool>(auth.loading),
                      child: body,
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
