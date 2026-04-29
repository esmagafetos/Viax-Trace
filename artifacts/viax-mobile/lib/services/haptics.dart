import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Centralized haptic feedback for the entire app.
///
/// All buttons, taps, and notifications go through these helpers so that the
/// user-controlled toggle in Settings → Perfil works globally without each
/// screen having to read provider state.
///
/// Stored device-locally via shared_preferences (a haptics preference doesn't
/// need to sync across devices and the web app has no haptic feedback).
class AppHaptics {
  static const _kKey = 'viax.hapticsEnabled';
  static bool _enabled = true;
  static bool _loaded = false;

  static Future<void> load() async {
    if (_loaded) return;
    final prefs = await SharedPreferences.getInstance();
    _enabled = prefs.getBool(_kKey) ?? true;
    _loaded = true;
  }

  static bool get enabled => _enabled;

  static Future<void> setEnabled(bool value) async {
    _enabled = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kKey, value);
  }

  /// Subtle click — for tab switches, opening menus, toggling chips/filters,
  /// theme switch, list selection.
  static void selection() {
    if (!_enabled) return;
    HapticFeedback.selectionClick();
  }

  /// Light bump — for primary action buttons (Salvar, Entrar, Iniciar análise,
  /// Nova análise, Criar conta).
  static void tap() {
    if (!_enabled) return;
    HapticFeedback.lightImpact();
  }

  /// Medium thud — for completion of a long-running success (analysis done,
  /// upload finished, settings saved successfully).
  static void success() {
    if (!_enabled) return;
    HapticFeedback.mediumImpact();
  }

  /// Heavy bump — for blocking errors (login failed, upload rejected,
  /// destructive confirmation).
  static void error() {
    if (!_enabled) return;
    HapticFeedback.heavyImpact();
  }
}
