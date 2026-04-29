import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  // Light
  static const bg = Color(0xFFF4F3EF);
  static const surface = Color(0xFFFAF9F6);
  static const surface2 = Color(0xFFEDECE7);
  static const text = Color(0xFF1A1917);
  static const textMuted = Color(0xFF4A4742);
  static const textFaint = Color(0xFF8A8680);
  static const border = Color(0xFFE1DFD8);
  static const borderStrong = Color(0xFFD4D1C8);
  static const accent = Color(0xFFD4521A);
  static const accentDim = Color(0x1AD4521A);
  static const ok = Color(0xFF1A7A4A);
  static const okDim = Color(0x1A1A7A4A);

  // Dark
  static const bgDark = Color(0xFF121110);
  static const surfaceDark = Color(0xFF1C1B19);
  static const surface2Dark = Color(0xFF24221F);
  static const textDark = Color(0xFFF0EDE8);
  static const textMutedDark = Color(0xFFB5B0A8);
  static const textFaintDark = Color(0xFF7A766E);
  static const borderDark = Color(0xFF2D2B27);
  static const borderStrongDark = Color(0xFF3A3833);
  static const accentDark = Color(0xFFE8703A);
  static const accentDimDark = Color(0x33E8703A);
  static const okDark = Color(0xFF2EA863);
  static const okDimDark = Color(0x332EA863);
}

class AppRadii {
  static const sm = 8.0;
  static const md = 10.0;
  static const lg = 14.0;
  static const xl = 20.0;
  static const pill = 999.0;
}

extension AppPalette on BuildContext {
  Brightness get brightness => Theme.of(this).brightness;
  bool get isDark => brightness == Brightness.dark;

  Color get bg => isDark ? AppColors.bgDark : AppColors.bg;
  Color get surface => isDark ? AppColors.surfaceDark : AppColors.surface;
  Color get surface2 => isDark ? AppColors.surface2Dark : AppColors.surface2;
  Color get text => isDark ? AppColors.textDark : AppColors.text;
  Color get textMuted => isDark ? AppColors.textMutedDark : AppColors.textMuted;
  Color get textFaint => isDark ? AppColors.textFaintDark : AppColors.textFaint;
  Color get border => isDark ? AppColors.borderDark : AppColors.border;
  Color get borderStrong => isDark ? AppColors.borderStrongDark : AppColors.borderStrong;
  Color get accent => isDark ? AppColors.accentDark : AppColors.accent;
  Color get accentDim => isDark ? AppColors.accentDimDark : AppColors.accentDim;
  Color get ok => isDark ? AppColors.okDark : AppColors.ok;
  Color get okDim => isDark ? AppColors.okDimDark : AppColors.okDim;
}

ThemeData buildTheme(Brightness b) {
  final isDark = b == Brightness.dark;
  final scheme = isDark
      ? const ColorScheme.dark(
          primary: AppColors.accentDark,
          secondary: AppColors.okDark,
          surface: AppColors.surfaceDark,
          onPrimary: Colors.white,
          onSurface: AppColors.textDark,
        )
      : const ColorScheme.light(
          primary: AppColors.accent,
          secondary: AppColors.ok,
          surface: AppColors.surface,
          onPrimary: Colors.white,
          onSurface: AppColors.text,
        );

  final base = isDark ? ThemeData.dark(useMaterial3: true) : ThemeData.light(useMaterial3: true);

  return base.copyWith(
    colorScheme: scheme,
    scaffoldBackgroundColor: isDark ? AppColors.bgDark : AppColors.bg,
    splashFactory: NoSplash.splashFactory,
    textTheme: GoogleFonts.poppinsTextTheme(base.textTheme).apply(
      bodyColor: isDark ? AppColors.textDark : AppColors.text,
      displayColor: isDark ? AppColors.textDark : AppColors.text,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: isDark ? AppColors.surface2Dark : AppColors.surface2,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      isDense: true,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadii.sm),
        borderSide: BorderSide(color: isDark ? AppColors.borderStrongDark : AppColors.borderStrong),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadii.sm),
        borderSide: BorderSide(color: isDark ? AppColors.borderStrongDark : AppColors.borderStrong),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadii.sm),
        borderSide: BorderSide(color: isDark ? AppColors.accentDark : AppColors.accent, width: 1.5),
      ),
      hintStyle: TextStyle(
        color: isDark ? AppColors.textFaintDark : AppColors.textFaint,
        fontSize: 13.5,
      ),
      labelStyle: TextStyle(fontSize: 13.5),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        elevation: 0,
        backgroundColor: isDark ? AppColors.accentDark : AppColors.accent,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.lg)),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
        minimumSize: const Size(0, 42),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        textStyle: GoogleFonts.poppins(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.1,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: isDark ? AppColors.textDark : AppColors.text,
        side: BorderSide(color: isDark ? AppColors.borderStrongDark : AppColors.borderStrong),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.lg)),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
        minimumSize: const Size(0, 42),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        textStyle: GoogleFonts.poppins(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.1,
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: isDark ? AppColors.accentDark : AppColors.accent,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        textStyle: GoogleFonts.poppins(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.1,
        ),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: isDark ? const Color(0xFF2A1410) : const Color(0xFF2A1410),
      contentTextStyle: GoogleFonts.poppins(color: const Color(0xFFF4A58A), fontSize: 13),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.sm)),
      behavior: SnackBarBehavior.floating,
    ),
  );
}
