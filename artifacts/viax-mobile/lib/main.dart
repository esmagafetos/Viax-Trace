import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';

import 'api/api_client.dart';
import 'router.dart';
import 'state/auth_provider.dart';
import 'state/processing_service.dart';
import 'state/server_config.dart';
import 'state/settings_provider.dart';
import 'state/theme_provider.dart';
import 'theme/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('pt_BR', null);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
  ));

  final config = ServerConfig();
  await config.load();

  final api = ApiClient();
  await api.init(config);

  final themeProv = ThemeProvider();
  await themeProv.load();

  runApp(ViaXApp(api: api, config: config, themeProv: themeProv));
}

class ViaXApp extends StatelessWidget {
  final ApiClient api;
  final ServerConfig config;
  final ThemeProvider themeProv;
  const ViaXApp({
    super.key,
    required this.api,
    required this.config,
    required this.themeProv,
  });

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<ServerConfig>.value(value: config),
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
              return MediaQuery(
                data: MediaQuery.of(ctx).copyWith(textScaler: const TextScaler.linear(1.0)),
                child: DefaultTextStyle.merge(
                  style: GoogleFonts.poppins(),
                  child: child ?? const SizedBox.shrink(),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
