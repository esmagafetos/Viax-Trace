import 'dart:async';

import 'package:flutter/foundation.dart';

import '../api/api_client.dart';
import '../api/sse_client.dart';

/// Holds the state of a single in-flight upload+SSE job, so it can keep
/// running while the user navigates between screens. The associated screen
/// always reads from this service when displaying steps/result, and a
/// floating banner in the layout follows the user around when the job is
/// running and they are on a different page.
class ProcessingService extends ChangeNotifier {
  bool _active = false;
  String _label = '';
  String _returnPath = '/process';
  String _kind = 'process';
  final List<String> _steps = [];
  Map<String, dynamic>? _result;
  String? _error;
  bool _cancelled = false;
  StreamSubscription<SseEvent>? _sub;

  bool get active => _active;
  String get label => _label;
  String get returnPath => _returnPath;
  String get kind => _kind;
  List<String> get steps => List.unmodifiable(_steps);
  Map<String, dynamic>? get result => _result;
  String? get error => _error;
  bool get hasFinished => !_active && (_result != null || _error != null);

  /// Starts a new upload+stream job. Resets any previous state.
  Future<void> start({
    required ApiClient api,
    required String endpointPath,
    required String filePath,
    required String label,
    required String returnPath,
    String kind = 'process',
    Map<String, String> extraFields = const {},
  }) async {
    await cancel();
    _active = true;
    _label = label;
    _returnPath = returnPath;
    _kind = kind;
    _steps.clear();
    _result = null;
    _error = null;
    _cancelled = false;
    notifyListeners();

    final stream = uploadAndStream(
      api: api,
      endpointPath: endpointPath,
      filePath: filePath,
      extraFields: extraFields,
    );

    _sub = stream.listen(
      (ev) {
        if (_cancelled) return;
        if (ev.event == 'step' && ev.data is Map && ev.data['step'] is String) {
          _steps.add(ev.data['step'] as String);
          if (_steps.length > 30) _steps.removeAt(0);
          notifyListeners();
        } else if (ev.event == 'result' && ev.data is Map && ev.data['result'] is Map) {
          _result = Map<String, dynamic>.from(ev.data['result'] as Map);
          _steps.add(kind == 'condominium'
              ? '✓ Sequência logística pronta!'
              : '✓ Análise concluída!');
          notifyListeners();
        } else if (ev.event == 'error' && ev.data is Map && ev.data['error'] is String) {
          _error = ev.data['error'] as String;
          notifyListeners();
        }
      },
      onError: (e) {
        if (_cancelled) return;
        _error = 'Erro de conexão: $e';
        _active = false;
        notifyListeners();
      },
      onDone: () {
        if (_cancelled) return;
        _active = false;
        notifyListeners();
      },
      cancelOnError: false,
    );
  }

  /// Stops the current job (if any) and resets state. Called when the
  /// user disables background mode and leaves the screen, or when we
  /// want to clear after consuming the result.
  Future<void> cancel() async {
    _cancelled = true;
    final s = _sub;
    _sub = null;
    if (s != null) {
      try {
        await s.cancel();
      } catch (_) {}
    }
    if (_active) {
      _active = false;
      notifyListeners();
    }
  }

  /// Clears the finished result/error so the banner disappears and the
  /// screen returns to its empty state.
  void clear() {
    _steps.clear();
    _result = null;
    _error = null;
    _active = false;
    _cancelled = false;
    notifyListeners();
  }
}
