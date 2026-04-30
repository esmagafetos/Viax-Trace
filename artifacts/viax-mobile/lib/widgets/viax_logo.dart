import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme/theme.dart';

/// Wordmark logo: ViaX:Trace, with separator coloring.
class ViaXLogo extends StatelessWidget {
  final double fontSize;
  final bool showSubtitle;
  const ViaXLogo({super.key, this.fontSize = 22, this.showSubtitle = false});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        RichText(
          text: TextSpan(
            style: GoogleFonts.poppins(
              fontSize: fontSize,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
              color: context.text,
            ),
            children: [
              const TextSpan(text: 'ViaX'),
              TextSpan(text: ':', style: TextStyle(color: context.textFaint, fontWeight: FontWeight.w300)),
              TextSpan(text: 'Trace', style: TextStyle(color: context.accent)),
            ],
          ),
        ),
        if (showSubtitle)
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text(
              'Auditoria inteligente de rotas',
              style: TextStyle(fontSize: 11, color: context.textFaint),
            ),
          ),
      ],
    );
  }
}

class GitHubBanner extends StatelessWidget {
  const GitHubBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [context.surface, context.surface2],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(color: context.borderStrong),
        borderRadius: BorderRadius.circular(AppRadii.lg),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: context.accentDim,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(Icons.code, color: context.accent, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Open Source', style: TextStyle(color: context.text, fontWeight: FontWeight.w700, fontSize: 13)),
                const SizedBox(height: 2),
                Text('github.com/ViaXTrace/Viax-Trace',
                    style: TextStyle(color: context.textMuted, fontSize: 11)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
