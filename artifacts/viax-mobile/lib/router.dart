import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'screens/dashboard.dart';
import 'screens/docs.dart';
import 'screens/history.dart';
import 'screens/login.dart';
import 'screens/process.dart';
import 'screens/register.dart';
import 'screens/settings.dart';
import 'screens/setup.dart';
import 'screens/tool.dart';
import 'state/auth_provider.dart';
import 'theme/theme.dart';

GoRouter createRouter(AuthProvider auth) {
  return GoRouter(
    initialLocation: '/setup',
    refreshListenable: auth,
    redirect: (ctx, state) {
      if (auth.loading) return null;
      final loc = state.matchedLocation;
      const publics = {'/login', '/register', '/setup'};
      final isPublic = publics.contains(loc);
      if (!auth.isAuthenticated && !isPublic) return '/login';
      if (auth.isAuthenticated && isPublic) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/setup', builder: (_, __) => const SetupScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(path: '/dashboard', builder: (_, __) => const DashboardScreen()),
      GoRoute(path: '/process', builder: (_, __) => const ProcessScreen()),
      GoRoute(path: '/tool', builder: (_, __) => const ToolScreen()),
      GoRoute(path: '/history', builder: (_, __) => const HistoryScreen()),
      GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
      GoRoute(path: '/docs', builder: (_, __) => const DocsScreen()),
    ],
    errorBuilder: (ctx, st) => Scaffold(
      backgroundColor: ctx.bg,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Página não encontrada', style: TextStyle(color: ctx.text, fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: () => ctx.go('/dashboard'), child: const Text('Voltar')),
          ],
        ),
      ),
    ),
  );
}
