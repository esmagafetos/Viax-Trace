import 'dart:async';

import 'package:flutter/material.dart';

import '../theme/theme.dart';
import '../widgets/brand_mark.dart';

/// Branded boot splash shown while the app is checking the existing session
/// against the backend on cold start.
///
/// The Render free-tier API can sleep — when it wakes, the first request can
/// take 30-60 seconds. Instead of flashing the login screen and then jumping
/// straight to the dashboard, we hold this screen for the entire bootstrap and
/// progressively reveal a friendlier "waking the server" copy after a few
/// seconds so the wait feels intentional.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  Timer? _t1;
  Timer? _t2;
  int _phase = 0;

  @override
  void initState() {
    super.initState();
    _t1 = Timer(const Duration(milliseconds: 2500), () {
      if (mounted) setState(() => _phase = 1);
    });
    _t2 = Timer(const Duration(seconds: 8), () {
      if (mounted) setState(() => _phase = 2);
    });
  }

  @override
  void dispose() {
    _t1?.cancel();
    _t2?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final status = _phase == 0
        ? 'Conectando…'
        : _phase == 1
            ? 'Acordando o servidor…'
            : 'Quase lá — o servidor estava em repouso';

    return Scaffold(
      backgroundColor: context.bg,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const _PulseFade(
                child: BrandLockup(
                  markSize: 56,
                  wordmarkSize: 30,
                  showSubtitle: true,
                  horizontal: false,
                ),
              ),
              const SizedBox(height: 28),
              SizedBox(
                width: 180,
                height: 3,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: const _ShimmerBar(),
                ),
              ),
              const SizedBox(height: 18),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 220),
                child: Text(
                  status,
                  key: ValueKey<int>(_phase),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12.5,
                    color: context.textMuted,
                    letterSpacing: 0.2,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PulseFade extends StatefulWidget {
  final Widget child;
  const _PulseFade({required this.child});

  @override
  State<_PulseFade> createState() => _PulseFadeState();
}

class _PulseFadeState extends State<_PulseFade> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1600),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: Tween<double>(begin: 0.55, end: 1.0).animate(
        CurvedAnimation(parent: _c, curve: Curves.easeInOut),
      ),
      child: widget.child,
    );
  }
}

class _ShimmerBar extends StatefulWidget {
  const _ShimmerBar();

  @override
  State<_ShimmerBar> createState() => _ShimmerBarState();
}

class _ShimmerBarState extends State<_ShimmerBar> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  )..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (ctx, _) {
        final t = _c.value;
        return Stack(
          children: [
            Positioned.fill(
              child: ColoredBox(color: context.surface2),
            ),
            Positioned(
              left: -100 + (t * 280),
              top: 0,
              bottom: 0,
              width: 110,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      context.accent.withValues(alpha: 0.0),
                      context.accent,
                      context.accent.withValues(alpha: 0.0),
                    ],
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
