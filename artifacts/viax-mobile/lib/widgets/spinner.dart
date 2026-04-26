import 'package:flutter/material.dart';

import '../theme/theme.dart';

class AppSpinner extends StatelessWidget {
  final double size;
  final Color? color;
  const AppSpinner({super.key, this.size = 28, this.color});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CircularProgressIndicator(
        strokeWidth: 2.5,
        valueColor: AlwaysStoppedAnimation(color ?? context.accent),
      ),
    );
  }
}

class StatTile extends StatelessWidget {
  final String value;
  final String label;
  final Color? accent;
  const StatTile({super.key, required this.value, required this.label, this.accent});

  @override
  Widget build(BuildContext context) {
    final color = accent ?? context.text;
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
      decoration: BoxDecoration(
        color: context.surface,
        borderRadius: BorderRadius.circular(AppRadii.lg),
        border: Border.all(color: context.borderStrong),
      ),
      child: Stack(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(value,
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: color, letterSpacing: -0.5)),
              const SizedBox(height: 4),
              Text(label.toUpperCase(),
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: context.textFaint, letterSpacing: 0.6)),
            ],
          ),
          Positioned(
            left: -14,
            right: -14,
            bottom: -10,
            child: Container(height: 2, color: color),
          ),
        ],
      ),
    );
  }
}
