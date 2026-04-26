import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../state/auth_provider.dart';
import '../theme/theme.dart';
import 'viax_logo.dart';

/// Shared scaffold: top bar with logo + avatar menu, bottom navigation
/// matching the web app's `Layout`.
class AppLayout extends StatelessWidget {
  final Widget child;
  final String currentPath;
  final EdgeInsetsGeometry padding;

  const AppLayout({
    super.key,
    required this.child,
    required this.currentPath,
    this.padding = const EdgeInsets.fromLTRB(16, 16, 16, 16),
  });

  static const _navItems = <_NavItem>[
    _NavItem(path: '/dashboard', label: 'Painel', icon: Icons.dashboard_outlined),
    _NavItem(path: '/process', label: 'Processar', icon: Icons.upload_file_outlined),
    _NavItem(path: '/tool', label: 'Condomínios', icon: Icons.apartment_outlined),
    _NavItem(path: '/history', label: 'Histórico', icon: Icons.history_outlined),
    _NavItem(path: '/docs', label: 'Docs', icon: Icons.menu_book_outlined),
  ];

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return Scaffold(
      backgroundColor: context.bg,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(56),
        child: SafeArea(
          bottom: false,
          child: Container(
            decoration: BoxDecoration(
              color: context.surface,
              border: Border(bottom: BorderSide(color: context.border)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            height: 56,
            child: Row(
              children: [
                GestureDetector(
                  onTap: () => context.go('/dashboard'),
                  child: const ViaXLogo(fontSize: 18),
                ),
                const Spacer(),
                PopupMenuButton<String>(
                  position: PopupMenuPosition.under,
                  offset: const Offset(0, 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  color: context.surface,
                  itemBuilder: (_) => [
                    PopupMenuItem(
                      enabled: false,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(user?.name ?? '—',
                              style: TextStyle(color: context.text, fontWeight: FontWeight.w700, fontSize: 13)),
                          Text(user?.email ?? '',
                              style: TextStyle(color: context.textFaint, fontSize: 11)),
                        ],
                      ),
                    ),
                    const PopupMenuDivider(),
                    PopupMenuItem(
                      value: '/settings',
                      child: Row(children: [
                        Icon(Icons.settings_outlined, size: 16, color: context.textMuted),
                        const SizedBox(width: 10),
                        const Text('Configurações'),
                      ]),
                    ),
                    PopupMenuItem(
                      value: 'logout',
                      child: Row(children: [
                        Icon(Icons.logout, size: 16, color: context.accent),
                        const SizedBox(width: 10),
                        Text('Sair', style: TextStyle(color: context.accent)),
                      ]),
                    ),
                  ],
                  onSelected: (v) async {
                    if (v == 'logout') {
                      await context.read<AuthProvider>().logout();
                      if (context.mounted) context.go('/login');
                    } else {
                      context.go(v);
                    }
                  },
                  child: _Avatar(name: user?.name ?? '', avatarUrl: user?.avatarUrl),
                ),
              ],
            ),
          ),
        ),
      ),
      body: SafeArea(
        top: false,
        bottom: false,
        child: SingleChildScrollView(
          padding: padding,
          child: child,
        ),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: context.surface,
          border: Border(top: BorderSide(color: context.border)),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
            child: Row(
              children: _navItems.map((item) {
                final active = currentPath == item.path;
                return Expanded(
                  child: InkWell(
                    onTap: () => context.go(item.path),
                    borderRadius: BorderRadius.circular(10),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(item.icon, size: 20, color: active ? context.accent : context.textFaint),
                          const SizedBox(height: 3),
                          Text(item.label,
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                                color: active ? context.accent : context.textFaint,
                              )),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem {
  final String path;
  final String label;
  final IconData icon;
  const _NavItem({required this.path, required this.label, required this.icon});
}

class _Avatar extends StatelessWidget {
  final String name;
  final String? avatarUrl;
  const _Avatar({required this.name, this.avatarUrl});

  @override
  Widget build(BuildContext context) {
    final initial = name.isNotEmpty ? name[0].toUpperCase() : 'U';
    return Container(
      width: 34,
      height: 34,
      decoration: BoxDecoration(
        color: context.accentDim,
        shape: BoxShape.circle,
        border: Border.all(color: context.borderStrong),
      ),
      clipBehavior: Clip.antiAlias,
      child: (avatarUrl != null && avatarUrl!.isNotEmpty)
          ? Image.network(
              avatarUrl!.startsWith('http')
                  ? avatarUrl!
                  : '${context.read<AuthProvider>().api.baseUrl}$avatarUrl',
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Center(
                child: Text(initial, style: TextStyle(color: context.accent, fontWeight: FontWeight.w700)),
              ),
            )
          : Center(
              child: Text(initial,
                  style: TextStyle(color: context.accent, fontWeight: FontWeight.w700)),
            ),
    );
  }
}

// Reusable card widgets ──────────────────────────────────────────────
class CardSection extends StatelessWidget {
  final Widget? header;
  final Widget child;
  final EdgeInsetsGeometry padding;
  const CardSection({super.key, this.header, required this.child, this.padding = const EdgeInsets.all(16)});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.surface,
        borderRadius: BorderRadius.circular(AppRadii.lg),
        border: Border.all(color: context.borderStrong),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 16, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (header != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              decoration: BoxDecoration(border: Border(bottom: BorderSide(color: context.border))),
              child: header!,
            ),
          Padding(padding: padding, child: child),
        ],
      ),
    );
  }
}

class CardHeaderLabel extends StatelessWidget {
  final String text;
  const CardHeaderLabel(this.text, {super.key});
  @override
  Widget build(BuildContext context) => Text(
        text.toUpperCase(),
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
          color: context.textMuted,
        ),
      );
}
