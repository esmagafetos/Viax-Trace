import 'package:flutter/material.dart';

import '../theme/theme.dart';

/// ViaX:Trace brand mark — espelha 1:1 o `LogoIcon`/`AppIcon` da web
/// (`artifacts/viax-scout/src/components/ViaXLogo.tsx`):
///   - curva: M10 10 C 10 10, 10 20, 17 22 C 23 24, 24 25, 24 25
///   - ponto de origem: circle(10, 10) r=3
///   - pin de destino: circle(30, 30) r=5.5 (laranja) + r=2.2 branco
///
/// Renderizado via [CustomPainter] pra ser nítido em qualquer densidade,
/// adaptando cores ao tema claro/escuro quando [withBackground] = false.
class BrandMark extends StatelessWidget {
  /// Lado do quadrado (largura = altura).
  final double size;

  /// Se `true`, desenha o fundo arredondado (igual ao ícone do app).
  /// Se `false`, desenha apenas o glifo (curva + ponto + pin).
  final bool withBackground;

  /// Sobrescreve a cor do glifo (default: `#1a1917` se houver fundo,
  /// `context.text` caso contrário).
  final Color? glyphColor;

  /// Sobrescreve a cor do pin laranja (default: `#d4521a`).
  final Color? accentColor;

  /// Sobrescreve a cor do fundo (default: `#ffffff`, igual ao favicon web).
  final Color? backgroundColor;

  const BrandMark({
    super.key,
    this.size = 56,
    this.withBackground = true,
    this.glyphColor,
    this.accentColor,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    final bg = backgroundColor ?? Colors.white;
    final glyph = glyphColor ?? (withBackground ? const Color(0xFF1A1917) : context.text);
    final accent = accentColor ?? const Color(0xFFD4521A);
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _BrandMarkPainter(
          bgColor: withBackground ? bg : null,
          glyphColor: glyph,
          accentColor: accent,
        ),
      ),
    );
  }
}

class _BrandMarkPainter extends CustomPainter {
  final Color? bgColor;
  final Color glyphColor;
  final Color accentColor;

  _BrandMarkPainter({
    required this.bgColor,
    required this.glyphColor,
    required this.accentColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width;
    // Coordenadas do design web AppIcon (40x40). Tudo escalado por (s/40).
    final k = s / 40.0;

    if (bgColor != null) {
      final radius = 9.0 * k;
      final rect = Rect.fromLTWH(0, 0, s, s);
      final rrect = RRect.fromRectAndRadius(rect, Radius.circular(radius));
      canvas.drawRRect(rrect, Paint()..color = bgColor!);
    }

    // Curva: M10 10 C 10 10, 10 20, 17 22 C 23 24, 24 25, 24 25
    final path = Path()
      ..moveTo(10 * k, 10 * k)
      ..cubicTo(10 * k, 10 * k, 10 * k, 20 * k, 17 * k, 22 * k)
      ..cubicTo(23 * k, 24 * k, 24 * k, 25 * k, 24 * k, 25 * k);

    final stroke = Paint()
      ..color = glyphColor
      ..strokeWidth = 2.2 * k
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;
    canvas.drawPath(path, stroke);

    // Ponto de origem (escuro): circle(10, 10) r=3
    canvas.drawCircle(Offset(10 * k, 10 * k), 3 * k, Paint()..color = glyphColor);

    // Pin laranja: circle(30, 30) r=5.5
    canvas.drawCircle(Offset(30 * k, 30 * k), 5.5 * k, Paint()..color = accentColor);

    // Centro branco do pin (apenas com fundo, pra contraste com o ícone real;
    // sem fundo o "branco" seria a cor do scaffold e poderia sumir, então usamos
    // a cor do fundo do app como destaque).
    final innerColor = bgColor ?? Colors.white;
    canvas.drawCircle(Offset(30 * k, 30 * k), 2.2 * k, Paint()..color = innerColor);
  }

  @override
  bool shouldRepaint(covariant _BrandMarkPainter old) =>
      old.bgColor != bgColor ||
      old.glyphColor != glyphColor ||
      old.accentColor != accentColor;
}

/// Logotipo composto: brand mark + wordmark "ViaX:Trace".
/// - [horizontal] = true → mark à esquerda, wordmark à direita com tagline
///   logo abaixo (formato compacto, igual ao `<ViaXLogo size="md">` do web).
/// - [horizontal] = false → mark acima, wordmark centralizado embaixo.
///
/// O subtítulo agora é "AUDITORIA DE ROTAS" (uppercase + letter-spacing 0.12em),
/// idêntico ao web `ViaXLogo`.
class BrandLockup extends StatelessWidget {
  final double markSize;
  final double wordmarkSize;
  final bool showSubtitle;
  final bool horizontal;
  final bool dark;

  const BrandLockup({
    super.key,
    this.markSize = 28,
    this.wordmarkSize = 22,
    this.showSubtitle = true,
    this.horizontal = true,
    this.dark = false,
  });

  @override
  Widget build(BuildContext context) {
    // When [dark] is true, force the cream/light foreground regardless of the
    // active theme — used inside the dashboard hero gradient where the
    // background is always dark even in light mode.
    final wordmarkColor = dark ? const Color(0xFFF0EDE8) : context.text;
    final separatorColor = dark
        ? const Color(0xFFF0EDE8).withValues(alpha: 0.45)
        : context.textFaint;
    final taglineColor = dark
        ? const Color(0xFFF0EDE8).withValues(alpha: 0.55)
        : context.textFaint;
    final glyphColor = dark ? const Color(0xFFF0EDE8) : context.text;

    final wordmark = RichText(
      textAlign: horizontal ? TextAlign.left : TextAlign.center,
      text: TextSpan(
        style: TextStyle(
          fontSize: wordmarkSize,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.5,
          color: wordmarkColor,
          height: 1.05,
        ),
        children: [
          const TextSpan(text: 'ViaX'),
          TextSpan(
            text: ':',
            style: TextStyle(color: separatorColor, fontWeight: FontWeight.w300),
          ),
          const TextSpan(text: 'Trace'),
        ],
      ),
    );

    final tagline = Text(
      'AUDITORIA DE ROTAS',
      style: TextStyle(
        fontSize: 9,
        fontWeight: FontWeight.w600,
        letterSpacing: 1.4,
        color: taglineColor,
      ),
    );

    if (horizontal) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          BrandMark(size: markSize, withBackground: false, glyphColor: glyphColor),
          const SizedBox(width: 10),
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              wordmark,
              if (showSubtitle) ...[
                const SizedBox(height: 2),
                tagline,
              ],
            ],
          ),
        ],
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        BrandMark(size: markSize),
        const SizedBox(height: 14),
        wordmark,
        if (showSubtitle)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: tagline,
          ),
      ],
    );
  }
}
