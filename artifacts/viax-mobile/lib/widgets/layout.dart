import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../state/auth_provider.dart';
import '../state/processing_service.dart';
import '../state/theme_provider.dart';
import '../theme/theme.dart';
import 'brand_mark.dart';
import '../services/haptics.dart';
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

  int _activeIndex() => _navItems.indexWhere(
        (it) => currentPath == it.path || (it.path != '/dashboard' && currentPath.startsWith(it.path)),
      );

  @override
  Widget build(BuildContext context) {
    final mq = MediaQuery.of(context);
    final activeIdx = _activeIndex();
    return Scaffold(
      backgroundColor: context.bg,
      body: Column(
        children: [
          if (showNav) _Header(navItems: _navItems, isActive: _isActive),
          Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.translucent,
              // Swipe horizontal navega entre as abas (Dashboard → Processar →
              // Ferramenta → Histórico → Docs). Não interfere com o scroll
              // vertical: o GestureArena do Flutter direciona o gesto pelo
              // eixo dominante.
              onHorizontalDragEnd: (details) {
                if (activeIdx == -1) return;
                final v = details.primaryVelocity ?? 0;
                if (v.abs() < 250) return;
                final next = activeIdx + (v < 0 ? 1 : -1);
                if (next < 0 || next >= _navItems.length) return;
                AppHaptics.selection();
                context.go(_navItems[next].path);
              },
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
          ),
          ProcessingBanner(currentPath: currentPath),
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

    // Glassy header — espelha o `.header-glass` do web (surface 85%
     // + backdrop-filter blur(12px)).
    return ClipRect(
      child: BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: 14, sigmaY: 14),
        child: DecoratedBox(
      decoration: BoxDecoration(
        color: context.surface.withValues(alpha: 0.85),
        border: Border(bottom: BorderSide(color: context.border)),
      ),
      child: SafeArea(
        bottom: false,
        child: DecoratedBox(
          decoration: const BoxDecoration(),
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
                        child: _NavRow(
                          items: navItems,
                          isActive: isActive,
                          center: false,
                          chipBg: context.surface2,
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
        ),
      ),
    );
  }
}

/// Linha horizontal de chips com um *indicador laranja deslizante* que se
/// move suavemente entre as abas (320 ms easeOutCubic) e pulsa de leve
/// para reforçar a aba ativa. Espelha o comportamento do `Layout.tsx`
/// do web (artifacts/viax-scout).
class _NavRow extends StatefulWidget {
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
  State<_NavRow> createState() => _NavRowState();
}

class _NavRowState extends State<_NavRow> {
  late List<GlobalKey> _keys;
  late List<double> _lefts;
  late List<double> _tops;
  late List<double> _widths;
  late List<double> _heights;
  int _activeIdx = -1;
  final GlobalKey _stackKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    _rebuildKeys();
    _scheduleMeasure();
  }

  @override
  void didUpdateWidget(covariant _NavRow oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.items.length != oldWidget.items.length) _rebuildKeys();
    _scheduleMeasure();
  }

  void _rebuildKeys() {
    _keys = List.generate(widget.items.length, (_) => GlobalKey());
    _lefts = List.filled(widget.items.length, 0);
    _tops = List.filled(widget.items.length, 0);
    _widths = List.filled(widget.items.length, 0);
    _heights = List.filled(widget.items.length, 0);
  }

  void _scheduleMeasure() {
    WidgetsBinding.instance.addPostFrameCallback((_) => _measure());
  }

  void _measure() {
    if (!mounted) return;
    final stackBox = _stackKey.currentContext?.findRenderObject() as RenderBox?;
    if (stackBox == null || !stackBox.hasSize) return;
    bool changed = false;
    for (var i = 0; i < widget.items.length; i++) {
      final ctx = _keys[i].currentContext;
      if (ctx == null) continue;
      final box = ctx.findRenderObject() as RenderBox?;
      if (box == null || !box.hasSize) continue;
      final off = box.localToGlobal(Offset.zero, ancestor: stackBox);
      final w = box.size.width;
      final h = box.size.height;
      if ((_lefts[i] - off.dx).abs() > 0.5 ||
          (_tops[i] - off.dy).abs() > 0.5 ||
          (_widths[i] - w).abs() > 0.5 ||
          (_heights[i] - h).abs() > 0.5) {
        _lefts[i] = off.dx;
        _tops[i] = off.dy;
        _widths[i] = w;
        _heights[i] = h;
        changed = true;
      }
    }
    final newIdx = widget.items.indexWhere((it) => widget.isActive(it.path));
    if (newIdx != _activeIdx || changed) {
      setState(() => _activeIdx = newIdx);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasIndicator =
        _activeIdx >= 0 && _activeIdx < _widths.length && _widths[_activeIdx] > 0;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Stack(
        key: _stackKey,
        clipBehavior: Clip.none,
        children: [
          // 1) Indicador laranja: posicionado (não conta para o tamanho do
          //    Stack) e desenhado primeiro → fica ATRÁS dos chips.
          //    Posicionado com left/top/width/height EXATOS do chip ativo
          //    (medidos via GlobalKey) para que o pill case 1:1 com o chip
          //    e nunca fique mais alto/largo que ele — independente de o
          //    Stack ter sido expandido pelo SingleChildScrollView pra
          //    preencher o cross-axis do parent.
          if (hasIndicator)
            AnimatedPositioned(
              duration: const Duration(milliseconds: 320),
              curve: Curves.easeOutCubic,
              left: _lefts[_activeIdx],
              top: _tops[_activeIdx],
              width: _widths[_activeIdx],
              height: _heights[_activeIdx],
              child: const IgnorePointer(child: _PulsingPill()),
            ),
          // 2) Linha de chips: dimensiona o Stack e fica POR CIMA do indicador.
          Row(
            mainAxisAlignment:
                widget.center ? MainAxisAlignment.center : MainAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: List.generate(widget.items.length, (i) {
              final it = widget.items[i];
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: KeyedSubtree(
                  key: _keys[i],
                  child: _NavChip(
                    item: it,
                    active: widget.isActive(it.path),
                    bgInactive: widget.chipBg,
                    activeBgTransparent: true,
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}

class _NavChip extends StatelessWidget {
  final _NavItem item;
  final bool active;
  final Color? bgInactive;

  /// Quando true e a aba está ativa, o fundo do chip é transparente para
  /// que o indicador laranja deslizante (renderizado atrás) apareça.
  final bool activeBgTransparent;

  const _NavChip({
    required this.item,
    required this.active,
    this.bgInactive,
    this.activeBgTransparent = false,
  });

  @override
  Widget build(BuildContext context) {
    final fg = active ? context.accent : context.textMuted;
    final bg = active
        ? (activeBgTransparent ? Colors.transparent : context.accentDim)
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

/// Pílula laranja com glow pulsante — usada como indicador da aba ativa.
/// Pulsa de forma sutil (2.6 s, ease-in-out) e respeita reduce-motion.
class _PulsingPill extends StatefulWidget {
  const _PulsingPill();

  @override
  State<_PulsingPill> createState() => _PulsingPillState();
}

class _PulsingPillState extends State<_PulsingPill>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;
  late final Animation<double> _glow;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2600),
    );
    _glow = CurvedAnimation(parent: _c, curve: Curves.easeInOut);
    final reduceMotion =
        WidgetsBinding.instance.platformDispatcher.accessibilityFeatures.disableAnimations;
    if (!reduceMotion) _c.repeat(reverse: true);
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _glow,
      builder: (ctx, _) {
        final g = _glow.value;
        return Container(
          decoration: BoxDecoration(
            color: ctx.accentDim,
            borderRadius: BorderRadius.circular(99),
            border: Border.all(color: ctx.accent.withValues(alpha: 0.35)),
            boxShadow: [
              BoxShadow(
                color: ctx.accent.withValues(alpha: 0.10 + 0.18 * g),
                blurRadius: 12 + 6 * g,
                spreadRadius: g * 0.6,
              ),
            ],
          ),
        );
      },
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
          onTap: () {
            AppHaptics.selection();
            theme.toggle();
          },
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
          value: '/server-status',
          height: 40,
          child: Row(
            children: [
              Icon(Icons.dns_outlined, size: 16, color: context.textMuted),
              const SizedBox(width: 10),
              Text('Status do servidor', style: TextStyle(color: context.text, fontSize: 13)),
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
        AppHaptics.selection();
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

/// Floating bottom banner shown across all AppLayout screens whenever a
/// processing job is active (and the user is on a different page than the
/// job's return path). Tapping it navigates back to the originating screen.
class ProcessingBanner extends StatelessWidget {
  final String currentPath;
  const ProcessingBanner({super.key, required this.currentPath});

  @override
  Widget build(BuildContext context) {
    final svc = context.watch<ProcessingService>();
    final onSourceScreen = svc.returnPath == currentPath;
    final shouldShow = svc.active && !onSourceScreen;

    if (!shouldShow) return const SizedBox.shrink();

    final mq = MediaQuery.of(context);
    final lastStep = svc.steps.isNotEmpty ? svc.steps.last : 'Processando…';

    return SafeArea(
      top: false,
      child: Padding(
        padding: EdgeInsets.fromLTRB(12, 4, 12, mq.padding.bottom > 0 ? 4 : 12),
        child: Material(
          color: Colors.transparent,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: BackdropFilter(
              filter: ui.ImageFilter.blur(sigmaX: 14, sigmaY: 14),
              child: InkWell(
                onTap: () => context.go(svc.returnPath),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: context.surface.withValues(alpha: 0.92),
                    border: Border.all(color: context.borderStrong),
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.18),
                        blurRadius: 24,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.4,
                          color: context.accent,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              svc.label,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: context.text,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              lastStep,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 11,
                                color: context.textFaint,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      Icon(Icons.arrow_forward_ios,
                          size: 13, color: context.textMuted),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
