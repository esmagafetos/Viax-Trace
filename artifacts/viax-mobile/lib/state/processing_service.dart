import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

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

  // Progresso — rastreado via evento job_id + padrão [N/M] nos steps
  String? _jobId;
  int _processed = 0;
  int _total = 0;

  // Polling de fallback — ativado quando SSE cai antes do resultado
  Timer? _pollTimer;
  ApiClient? _pollApi;

  bool get active => _active;
  String get label => _label;
  String get returnPath => _returnPath;
  String get kind => _kind;
  List<String> get steps => List.unmodifiable(_steps);
  Map<String, dynamic>? get result => _result;
  String? get error => _error;
  bool get hasFinished => !_active && (_result != null || _error != null);

  String? get jobId => _jobId;
  int get processed => _processed;
  int get total => _total;
  bool get hasProgress => _total > 0;
  double get progressFraction => _total > 0 ? (_processed / _total).clamp(0.0, 1.0) : 0.0;

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
    _jobId = null;
    _processed = 0;
    _total = 0;
    _pollApi = api;
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
        if (ev.event == 'job_id' && ev.data is Map) {
          _jobId = ev.data['job_id'] as String?;
          final t = ev.data['total'];
          if (t is num) _total = t.toInt();
          _processed = 0;
          notifyListeners();
        } else if (ev.event == 'step' && ev.data is Map && ev.data['step'] is String) {
          final step = ev.data['step'] as String;
          _steps.add(step);
          if (_steps.length > 30) _steps.removeAt(0);
          // Extrai N de "[N/M] ..." para rastrear progresso via SSE
          final m = RegExp(r'^\[(\d+)/(\d+)\]').firstMatch(step);
          if (m != null) {
            _processed = int.tryParse(m.group(1)!) ?? _processed;
            final t = int.tryParse(m.group(2)!);
            if (t != null && t > 0) _total = t;
          }
          unawaited(ForegroundProcessing.update(title: _label, text: step));
          notifyListeners();
        } else if (ev.event == 'result' && ev.data is Map && ev.data['result'] is Map) {
          _result = Map<String, dynamic>.from(ev.data['result'] as Map);
          if (_total > 0) _processed = _total;
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
        // SSE caiu — ativa polling de fallback se temos um jobId
        if (_jobId != null && _result == null && _error == null) {
          _startPolling();
        } else {
          _error = 'Erro de conexão: $e';
          _active = false;
          unawaited(ForegroundProcessing.stop());
          unawaited(_fireCompletionNotification());
          notifyListeners();
        }
      },
      onDone: () {
        if (_cancelled) return;
        _stopPolling();
        _active = false;
        unawaited(ForegroundProcessing.stop());
        unawaited(_fireCompletionNotification());
        notifyListeners();
      },
      cancelOnError: false,
    );
  }

  // ── Polling de fallback ────────────────────────────────────────────────
  // Chamado quando o SSE cai mas ainda temos um jobId ativo.
  // Consulta GET /api/process/status/:jobId a cada 3 s.
  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (_) async {
      if (_cancelled || _jobId == null) {
        _stopPolling();
        return;
      }
      try {
        final api = _pollApi;
        if (api == null) return;
        final url = Uri.parse('${api.baseUrl}/api/process/status/$_jobId');
        final cookies = await api.cookieJar.loadForRequest(url);
        final cookieHeader =
            cookies.map((c) => '${c.name}=${c.value}').join('; ');
        final resp = await http
            .get(url, headers: {'Cookie': cookieHeader})
            .timeout(const Duration(seconds: 8));
        if (resp.statusCode != 200) return;
        final body = jsonDecode(resp.body) as Map<String, dynamic>;
        final status = body['status'] as String?;
        final p = body['processed'];
        final t = body['total'];
        if (p is num && t is num) {
          _processed = p.toInt();
          _total = t.toInt();
        }
        final step = body['current_step'] as String?;
        if (step != null && step.isNotEmpty) {
          if (_steps.isEmpty || _steps.last != step) {
            _steps.add('[poll] $step');
            if (_steps.length > 30) _steps.removeAt(0);
          }
          unawaited(ForegroundProcessing.update(
              title: _label, text: step));
        }
        notifyListeners();
        if (status == 'done') {
          _stopPolling();
          // Busca o resultado completo pelo analysis_id
          final aid = body['analysis_id'];
          if (aid is num) {
            unawaited(_fetchResultById(aid.toInt()));
          } else {
            _active = false;
            unawaited(ForegroundProcessing.stop());
            unawaited(_fireCompletionNotification());
            notifyListeners();
          }
        } else if (status == 'error') {
          _stopPolling();
          _error = body['error'] as String? ?? 'Erro desconhecido.';
          _active = false;
          unawaited(ForegroundProcessing.stop());
          unawaited(_fireCompletionNotification());
          notifyListeners();
        }
      } catch (_) {
        // silencia erros de rede no poll — tenta de novo no próximo tick
      }
    });
  }

  Future<void> _fetchResultById(int analysisId) async {
    try {
      final api = _pollApi;
      if (api == null) return;
      final url =
          Uri.parse('${api.baseUrl}/api/process/status/$analysisId');
      final cookies = await api.cookieJar.loadForRequest(url);
      final cookieHeader =
          cookies.map((c) => '${c.name}=${c.value}').join('; ');
      final resp = await http
          .get(url, headers: {'Cookie': cookieHeader})
          .timeout(const Duration(seconds: 12));
      if (resp.statusCode == 200) {
        final body = jsonDecode(resp.body) as Map<String, dynamic>;
        // Constrói um result compatível com o campo result do SSE
        _result = {
          'success': true,
          'analysis_id': body['id'],
          'total_enderecos': body['total_enderecos'],
          'total_nuances': body['total_nuances'],
          'percentual_problema': body['percentual_problema'],
          'detalhes': body['detalhes'] ?? [],
          'metricas_tecnicas': {
            'tempo_processamento_ms': body['processing_time_ms'],
            'taxa_geocode_sucesso': body['geocode_success'],
            'instancia': body['parser_mode'] ?? '',
            'tolerancia_metros': 300,
          },
        };
        if (_total > 0) _processed = _total;
        _steps.add('✓ Análise concluída!');
      }
    } catch (_) {}
    _active = false;
    unawaited(ForegroundProcessing.stop());
    unawaited(_fireCompletionNotification());
    notifyListeners();
  }

  void _stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  // ─────────────────────────────────────────────────────────────────────

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
    _stopPolling();
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
    _jobId = null;
    _processed = 0;
    _total = 0;
    notifyListeners();
  }
}
