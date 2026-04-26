import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../state/auth_provider.dart';
import '../state/theme_provider.dart';
import '../theme/theme.dart';
import 'brand_mark.dart';
import 'user_avatar.dart';

/// Shared scaffold espelhando 1:1 o `Layout.tsx` do web:
///
///   ┌──────────────────────────────────────────────────────┐
///   │ Brand · ←─ nav horizontal scrollável ─→ · 🌙 · ⓤ ⌄  │   ← sticky
///   ├──────────────────────────────────────────────────────┤
///   │ <conteúdo da tela>                                   │
///   │                                                      │
///   └──────────────────────────────────────────────────────┘
///
/// Sem bottom nav (web não tem). Em telas estreitas a nav vira faixa
/// horizontal scrollável logo abaixo do logo (igual ao `mobile-nav-scroll`
/// do web). O dropdown do avatar mostra nome+email, Configurações,
/// Documentação e Sair — exatamente como o web.
class AppLayout extends StatelessWidget {
  final Widget child;
  final String currentPath;
  final EdgeInsetsGeometry padding;
  final bool showNav;

  const AppLayout({
    super.key,
    required this.child,
    required this.currentPath,
    this.padding = const EdgeInsets.fromLTRB(16, 20, 16, 32),
    this.showNav = true,
  });

  static const _navItems = <_NavItem>[
    _NavItem(path: '/dashboard', label: 'Dashboard', icon: Icons.dashboard_outlined),
    _NavItem(path: '/process', label: 'Processar', icon: Icons.bolt_outlined),
    _NavItem(path: '/tool', label: 'Ferramenta', icon: Icons.build_outlined),
    _NavItem(path: '/history', label: 'Histórico', icon: Icons.history_outlined),
    _NavItem(path: '/docs', label: 'Docs', icon: Icons.description_outlined),
  ];

  bool _isActive(String path) {
    if (currentPath == path) return true;
    if (path != '/dashboard' && currentPath.startsWith(path)) return true;
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final mq = MediaQuery.of(context);
    return Scaffold(
      backgroundColor: context.bg,
      body: Column(
        children: [
          if (showNav) _Header(navItems: _navItems, isActive: _isActive),
          Expanded(
            child: SingleChildScrollView(
              padding: EdgeInsets.only(
                left: 0,
                right: 0,
                top: 0,
                bottom: mq.padding.bottom,
              ),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 1200),
                  child: Padding(padding: padding, child: child),
                ),
              ),
            ),
          ),
        ],
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

class _Header extends StatelessWidget {
  final List<_NavItem> navItems;
  final bool Function(String) isActive;
  const _Header({required this.navItems, required this.isActive});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final mq = MediaQuery.of(context);
    final width = mq.size.width;
    // < 760px: nav passa para a faixa scrollável abaixo do logo (mesmo
    // breakpoint que o `mobile-nav-scroll` do web).
    final compact = width < 760;

    return Material(
      color: context.surface,
      elevation: 0,
      child: SafeArea(
        bottom: false,
        child: DecoratedBox(
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: context.border)),
          ),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1200),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      height: 60,
                      child: Row(
                        children: [
                          // Brand
                          InkWell(
                            onTap: () => context.go('/dashboard'),
                            borderRadius: BorderRadius.circular(8),
                            child: const Padding(
                              padding: EdgeInsets.symmetric(vertical: 6, horizontal: 2),
                              child: BrandLockup(
                                markSize: 26,
                                wordmarkSize: 17,
                                showSubtitle: true,
                                horizontal: true,
                              ),
                            ),
                          ),
                          if (!compact) ...[
                            const SizedBox(width: 16),
                            Expanded(
                              child: _NavRow(
                                items: navItems,
                                isActive: isActive,
                                center: true,
                              ),
                            ),
                            const SizedBox(width: 16),
                          ] else
                            const Spacer(),
                          _ThemeToggle(),
                          const SizedBox(width: 8),
                          if (user != null)
                            _ProfileMenu(
                              name: user.name,
                              email: user.email,
                              avatarUrl: user.avatarUrl,
                            ),
                        ],
                      ),
                    ),
                    if (compact)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8, top: 2),
                        child: SizedBox(
                          height: 38,
                          child: _NavRow(
                            items: navItems,
                            isActive: isActive,
                            center: false,
                            chipBg: context.surface2,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavRow extends StatelessWidget {
  final List<_NavItem> items;
  final bool Function(String) isActive;
  final bool center;
  final Color? chipBg;
  const _NavRow({
    required this.items,
    required this.isActive,
    required this.center,
    this.chipBg,
  });

  @override
  Widget build(BuildContext context) {
    final children = items
        .map((it) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: _NavChip(
                item: it,
                active: isActive(it.path),
                bgInactive: chipBg,
              ),
            ))
        .toList();

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        mainAxisAlignment: center ? MainAxisAlignment.center : MainAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: children,
      ),
    );
  }
}

class _NavChip extends StatelessWidget {
  final _NavItem item;
  final bool active;
  final Color? bgInactive;
  const _NavChip({required this.item, required this.active, this.bgInactive});

  @override
  Widget build(BuildContext context) {
    final fg = active ? context.accent : context.textMuted;
    final bg = active
        ? context.accentDim
        : (bgInactive ?? Colors.transparent);
    return Material(
      color: bg,
      borderRadius: BorderRadius.circular(99),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.go(item.path),
        borderRadius: BorderRadius.circular(99),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(item.icon, size: 15, color: fg),
              const SizedBox(width: 6),
              Text(
                item.label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                  color: fg,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ThemeToggle extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = context.watch<ThemeProvider>();
    final dark = theme.dark;
    return Tooltip(
      message: dark ? 'Tema claro' : 'Tema escuro',
      child: Material(
        color: context.surface,
        shape: CircleBorder(side: BorderSide(color: context.border)),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: theme.toggle,
          child: SizedBox(
            width: 34,
            height: 34,
            child: Icon(
              dark ? Icons.wb_sunny_outlined : Icons.nightlight_outlined,
              size: 15,
              color: context.textMuted,
            ),
          ),
        ),
      ),
    );
  }
}

class _ProfileMenu extends StatelessWidget {
  final String name;
  final String email;
  final String? avatarUrl;
  const _ProfileMenu({
    required this.name,
    required this.email,
    this.avatarUrl,
  });

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      tooltip: 'Conta',
      position: PopupMenuPosition.under,
      offset: const Offset(0, 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: context.border),
      ),
      color: context.surface,
      elevation: 6,
      padding: EdgeInsets.zero,
      itemBuilder: (_) => [
        PopupMenuItem<String>(
          enabled: false,
          padding: EdgeInsets.zero,
          child: Container(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: context.border)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  name,
                  style: TextStyle(
                    color: context.text,
                    fontWeight: FontWeight.w600,
                    fontSize: 13.5,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  email,
                  style: TextStyle(
                    color: context.textMuted,
                    fontSize: 11.5,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
        PopupMenuItem<String>(
          value: '/settings',
          height: 40,
          child: Row(
            children: [
              Icon(Icons.settings_outlined, size: 16, color: context.textMuted),
              const SizedBox(width: 10),
              Text('Configurações', style: TextStyle(color: context.text, fontSize: 13)),
            ],
          ),
        ),
        PopupMenuItem<String>(
          value: '/docs',
          height: 40,
          child: Row(
            children: [
              Icon(Icons.description_outlined, size: 16, color: context.textMuted),
              const SizedBox(width: 10),
              Text('Documentação', style: TextStyle(color: context.text, fontSize: 13)),
            ],
          ),
        ),
        const PopupMenuDivider(height: 1),
        PopupMenuItem<String>(
          value: 'logout',
          height: 40,
          child: Row(
            children: [
              Icon(Icons.logout, size: 16, color: context.accent),
              const SizedBox(width: 10),
              Text('Sair',
                  style: TextStyle(
                    color: context.accent,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  )),
            ],
          ),
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
      child: UserAvatar(
        name: name,
        avatarUrl: avatarUrl,
        size: 34,
        fontSize: 13,
        border: Border.all(color: context.border, width: 2),
      ),
    );
  }
}

// ── Reusable card widgets (preservados) ──────────────────────────────
class CardSection extends StatelessWidget {
  final Widget? header;
  final Widget child;
  final EdgeInsetsGeometry padding;
  const CardSection({
    super.key,
    this.header,
    required this.child,
    this.padding = const EdgeInsets.all(16),
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.surface,
        borderRadius: BorderRadius.circular(AppRadii.lg),
        border: Border.all(color: context.borderStrong),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (header != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: context.border)),
              ),
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
