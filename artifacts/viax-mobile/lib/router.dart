import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'screens/analysis_detail.dart';
import 'screens/dashboard.dart';
import 'screens/docs.dart';
import 'screens/history.dart';
import 'screens/login.dart';
import 'screens/process.dart';
import 'screens/register.dart';
import 'screens/server_status.dart';
import 'screens/settings.dart';
import 'screens/setup.dart';
import 'screens/tool.dart';
import 'state/auth_provider.dart';
import 'theme/theme.dart';

/// Soft fade-only page transition used across the entire app — gives the
/// "Replit-like" smoothness the user requested. No slide, no scale, no zoom:
/// just opacity 0→1 over 220ms with an easeOutCubic curve so it feels native
/// and unobtrusive.
CustomTransitionPage<T> _fadePage<T>({
  required LocalKey key,
  required Widget child,
}) {
  return CustomTransitionPage<T>(
    key: key,
    child: child,
    transitionDuration: const Duration(milliseconds: 220),
    reverseTransitionDuration: const Duration(milliseconds: 180),
    transitionsBuilder: (_, animation, __, c) {
      final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
      return FadeTransition(opacity: curved, child: c);
    },
  );
}

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
      GoRoute(
        path: '/setup',
        pageBuilder: (_, st) => _fadePage(key: st.pageKey, child: const SetupScreen()),
      ),
      GoRoute(
        path: '/login',
        pageBuilder: (_, st) => _fadePage(key: st.pageKey, child: const LoginScreen()),
      ),
      GoRoute(
        path: '/register',
        pageBuilder: (_, st) => _fadePage(key: st.pageKey, child: const RegisterScreen()),
      ),
      GoRoute(
        path: '/dashboard',
        pageBuilder: (_, st) => _fadePage(key: st.pageKey, child: const DashboardScreen()),
      ),
      GoRoute(
        path: '/process',
        pageBuilder: (_, st) => _fadePage(key: st.pageKey, child: const ProcessScreen()),
      ),
      GoRoute(
        path: '/tool',
        pageBuilder: (_, st) => _fadePage(key: st.pageKey, child: const ToolScreen()),
      ),
      GoRoute(
        path: '/history',
        pageBuilder: (_, st) => _fadePage(key: st.pageKey, child: const HistoryScreen()),
      ),
      GoRoute(
        path: '/history/:id',
        pageBuilder: (_, st) {
          final id = int.tryParse(st.pathParameters['id'] ?? '') ?? 0;
          return _fadePage(key: st.pageKey, child: AnalysisDetailScreen(id: id));
        },
      ),
      GoRoute(
        path: '/settings',
        pageBuilder: (_, st) => _fadePage(key: st.pageKey, child: const SettingsScreen()),
      ),
      GoRoute(
        path: '/server-status',
        pageBuilder: (_, st) => _fadePage(key: st.pageKey, child: const ServerStatusScreen()),
      ),
      GoRoute(
        path: '/docs',
        pageBuilder: (_, st) => _fadePage(key: st.pageKey, child: const DocsScreen()),
      ),
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
