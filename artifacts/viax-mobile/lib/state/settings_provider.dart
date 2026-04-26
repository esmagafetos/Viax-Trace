import 'package:flutter/foundation.dart';

import '../api/api_client.dart';

class SettingsProvider extends ChangeNotifier {
  final ApiClient api;
  Map<String, dynamic>? _data;
  bool _loading = false;

  SettingsProvider(this.api);

  Map<String, dynamic>? get data => _data;
  bool get loading => _loading;

  String get instanceMode => (_data?['instanceMode'] as String?) ?? 'builtin';
  String get googleMapsApiKey => (_data?['googleMapsApiKey'] as String?) ?? '';
  String get parserMode => (_data?['parserMode'] as String?) ?? 'builtin';

  Future<void> load() async {
    _loading = true;
    notifyListeners();
    try {
      _data = await api.getSettings();
    } catch (_) {
      _data = null;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> save(Map<String, dynamic> patch) async {
    final res = await api.updateSettings(patch);
    _data = res;
    notifyListeners();
  }
}
