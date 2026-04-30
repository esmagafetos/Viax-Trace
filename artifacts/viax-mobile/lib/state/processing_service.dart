import 'dart:async';

import 'package:flutter/foundation.dart';

import '../api/api_client.dart';
import '../api/sse_client.dart';
import 'completion_notifications.dart';
import 'foreground_processing.dart';

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

    // Inicia o serviço em foreground para que o processo continue mesmo se
    // o usuário sair do app, exibindo notificação persistente com o progresso.
    unawaited(ForegroundProcessing.start(
      title: label,
      text: 'Iniciando processamento…',
    ));

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
          final step = ev.data['step'] as String;
          _steps.add(step);
          if (_steps.length > 30) _steps.removeAt(0);
          unawaited(ForegroundProcessing.update(title: _label, text: step));
          notifyListeners();
        } else if (ev.event == 'result' && ev.data is Map && ev.data['result'] is Map) {
          _result = Map<String, dynamic>.from(ev.data['result'] as Map);
          final doneText = kind == 'condominium'
              ? '✓ Sequência logística pronta!'
              : '✓ Análise concluída!';
          _steps.add(doneText);
          unawaited(ForegroundProcessing.update(title: _label, text: doneText));
          notifyListeners();
        } else if (ev.event == 'error' && ev.data is Map && ev.data['error'] is String) {
          _error = ev.data['error'] as String;
          unawaited(ForegroundProcessing.update(
              title: _label, text: 'Erro: ${_error!}'));
          notifyListeners();
        }
      },
      onError: (e) {
        if (_cancelled) return;
        _error = 'Erro de conexão: $e';
        _active = false;
        unawaited(ForegroundProcessing.stop());
        unawaited(_fireCompletionNotification());
        notifyListeners();
      },
      onDone: () {
        if (_cancelled) return;
        _active = false;
        unawaited(ForegroundProcessing.stop());
        unawaited(_fireCompletionNotification());
        notifyListeners();
      },
      cancelOnError: false,
    );
  }

  /// Dispara a notificação local de conclusão. O processamento em foreground
  /// service (`ForegroundProcessing`) só mantém uma notificação persistente
  /// "estou rodando" — ela é descartada ao parar o serviço, então emitimos
  /// uma notificação separada de "terminou" que abre o app no resultado.
  Future<void> _fireCompletionNotification() async {
    try {
      if (_error != null) {
        await CompletionNotifications.showError(
          label: _label,
          deepLink: _kind == 'process' ? '/history' : _returnPath,
          errorText: _error,
        );
        return;
      }
      if (_result == null) return;
      // /history/:id quando o backend devolver analysis_id; senão
      // mandamos para a lista (o item recém-criado fica no topo).
      String deepLink;
      if (_kind == 'process') {
        final id = _result!['analysis_id'];
        deepLink = (id is num) ? '/history/${id.toInt()}' : '/history';
      } else {
        deepLink = _returnPath;
      }
      String? subtitle;
      if (_kind == 'process') {
        final total = _result!['total_enderecos'];
        final nuances = _result!['total_nuances'];
        if (total is num && nuances is num) {
          subtitle =
              '$total endereço(s) · $nuances nuance(s) — toque para ver';
        }
      } else if (_kind == 'condominium') {
        subtitle = 'Sequência logística pronta — toque para abrir';
      }
      await CompletionNotifications.showSuccess(
        label: _label,
        deepLink: deepLink,
        subtitle: subtitle,
      );
    } catch (e) {
      if (kDebugMode) debugPrint('completion notification fail: $e');
    }
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
    unawaited(ForegroundProcessing.stop());
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
