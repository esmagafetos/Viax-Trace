import 'package:flutter/material.dart';

void showToast(BuildContext context, String message, {bool success = false}) {
  final isError = !success;
  ScaffoldMessenger.of(context)
    ..clearSnackBars()
    ..showSnackBar(
      SnackBar(
        backgroundColor: isError ? const Color(0xFF2A1410) : const Color(0xFF0D2018),
        content: Text(message,
            style: TextStyle(color: isError ? const Color(0xFFF4A58A) : const Color(0xFF86EFAC), fontSize: 13)),
        duration: const Duration(seconds: 4),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        margin: const EdgeInsets.all(16),
      ),
    );
}
