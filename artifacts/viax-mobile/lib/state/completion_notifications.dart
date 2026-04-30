import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:go_router/go_router.dart';

/// Local notifications fired when a long-running route processing job
/// finishes (success or error). The user explicitly enabled background
/// processing, so they have left the app — a notification is the only
/// way to bring them back to the result. Tap navigates to the relevant
/// page (history detail when we have an analysis_id, generic /history
/// or returnPath otherwise).
class CompletionNotifications {
  static final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();
  static GoRouter? router;
  static bool _ready = false;

  static const String _channelId = 'viax_completion';
  static const String _channelName = 'Rotas processadas';
  static const String _channelDesc =
      'Avisa quando uma análise de rota termina de ser processada em segundo plano.';

  static Future<void> initialize() async {
    if (_ready) return;
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: false,
      requestSoundPermission: true,
    );
    await _plugin.initialize(
      const InitializationSettings(android: androidInit, iOS: iosInit),
      onDidReceiveNotificationResponse: _onTap,
    );
    final androidImpl = _plugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
    if (androidImpl != null) {
      await androidImpl.createNotificationChannel(const AndroidNotificationChannel(
        _channelId,
        _channelName,
        description: _channelDesc,
        importance: Importance.high,
      ));
      // Android 13+ runtime permission
      try {
        await androidImpl.requestNotificationsPermission();
      } catch (_) {}
    }
    _ready = true;
  }

  static void _onTap(NotificationResponse r) {
    final payload = r.payload ?? '';
    final go = router;
    if (go == null) return;
    if (payload.startsWith('/')) {
      try {
        go.go(payload);
      } catch (e) {
        if (kDebugMode) debugPrint('CompletionNotifications nav error: $e');
        try {
          go.go('/history');
        } catch (_) {}
      }
    } else {
      try {
        go.go('/history');
      } catch (_) {}
    }
  }

  /// Notifica conclusão bem-sucedida. [deepLink] é o caminho a abrir
  /// quando o usuário tocar (ex: `/history/123`).
  static Future<void> showSuccess({
    required String label,
    required String deepLink,
    String? subtitle,
  }) async {
    if (!_ready) return;
    final body = subtitle ?? 'Toque para ver o resultado';
    await _plugin.show(
      4243,
      label.isEmpty ? 'Análise concluída' : '✓ $label',
      body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          _channelId,
          _channelName,
          channelDescription: _channelDesc,
          importance: Importance.high,
          priority: Priority.high,
          autoCancel: true,
          category: AndroidNotificationCategory.status,
        ),
        iOS: DarwinNotificationDetails(),
      ),
      payload: deepLink,
    );
  }

  /// Notifica falha do processamento.
  static Future<void> showError({
    required String label,
    required String deepLink,
    String? errorText,
  }) async {
    if (!_ready) return;
    final body = (errorText != null && errorText.isNotEmpty)
        ? errorText
        : 'Toque para ver detalhes';
    await _plugin.show(
      4244,
      label.isEmpty ? 'Falha ao processar' : 'Falha: $label',
      body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          _channelId,
          _channelName,
          channelDescription: _channelDesc,
          importance: Importance.high,
          priority: Priority.high,
          autoCancel: true,
          category: AndroidNotificationCategory.error,
        ),
        iOS: DarwinNotificationDetails(),
      ),
      payload: deepLink,
    );
  }
}
