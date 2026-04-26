import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

const String _kPrefKey = 'viax.server.baseUrl';

const String kApiBaseDefault =
    String.fromEnvironment('API_BASE', defaultValue: 'https://viax-scout.replit.app');

class ServerConfig extends ChangeNotifier {
  String _baseUrl = kApiBaseDefault;
  bool _loaded = false;

  String get baseUrl => _baseUrl;
  bool get isLoaded => _loaded;
  bool get isDefault => _baseUrl == kApiBaseDefault;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_kPrefKey);
    if (stored != null && stored.isNotEmpty) {
      _baseUrl = stored;
    }
    _loaded = true;
    notifyListeners();
  }

  Future<void> setBaseUrl(String url) async {
    final clean = _normalize(url);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kPrefKey, clean);
    _baseUrl = clean;
    notifyListeners();
  }

  Future<void> reset() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kPrefKey);
    _baseUrl = kApiBaseDefault;
    notifyListeners();
  }

  static String _normalize(String input) {
    var s = input.trim();
    if (s.isEmpty) return kApiBaseDefault;
    if (!s.startsWith('http://') && !s.startsWith('https://')) {
      s = 'http://$s';
    }
    while (s.endsWith('/')) {
      s = s.substring(0, s.length - 1);
    }
    return s;
  }
}
