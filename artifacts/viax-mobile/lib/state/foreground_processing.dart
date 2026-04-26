import 'package:flutter_foreground_task/flutter_foreground_task.dart';

@pragma('vm:entry-point')
void _foregroundEntry() {
  FlutterForegroundTask.setTaskHandler(_ProcessTaskHandler());
}

class _ProcessTaskHandler extends TaskHandler {
  @override
  Future<void> onStart(DateTime timestamp, TaskStarter starter) async {}

  @override
  void onRepeatEvent(DateTime timestamp) {}

  @override
  Future<void> onDestroy(DateTime timestamp) async {}
}

class ForegroundProcessing {
  static bool _initialized = false;

  static void initialize() {
    if (_initialized) return;
    _initialized = true;
    FlutterForegroundTask.initCommunicationPort();
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'viax_processing',
        channelName: 'Processamento de rotas',
        channelDescription:
            'Mostra o progresso da auditoria em tempo real enquanto o app está em segundo plano.',
        channelImportance: NotificationChannelImportance.LOW,
        priority: NotificationPriority.LOW,
        showWhen: false,
      ),
      iosNotificationOptions: const IOSNotificationOptions(
        showNotification: true,
        playSound: false,
      ),
      foregroundTaskOptions: ForegroundTaskOptions(
        eventAction: ForegroundTaskEventAction.nothing(),
        autoRunOnBoot: false,
        autoRunOnMyPackageReplaced: false,
        allowWakeLock: true,
        allowWifiLock: false,
      ),
    );
  }

  /// Verifica e (se necessário) abre as configurações do sistema para que o
  /// usuário desabilite a otimização de bateria, garantindo que o serviço de
  /// foreground não seja morto pelo Android quando o app for para o segundo
  /// plano. Retorna `true` se a permissão está concedida.
  static Future<bool> ensureBatteryOptimizationDisabled() async {
    final ignoring = await FlutterForegroundTask.isIgnoringBatteryOptimizations;
    if (ignoring) return true;
    await FlutterForegroundTask.requestIgnoreBatteryOptimization();
    return await FlutterForegroundTask.isIgnoringBatteryOptimizations;
  }

  /// Solicita a permissão de notificações no Android 13+ / iOS. Sem isso a
  /// notificação persistente do foreground service não aparece.
  static Future<bool> ensureNotificationPermission() async {
    final status = await FlutterForegroundTask.checkNotificationPermission();
    if (status == NotificationPermission.granted) return true;
    final result = await FlutterForegroundTask.requestNotificationPermission();
    return result == NotificationPermission.granted;
  }

  static Future<void> start({
    required String title,
    required String text,
  }) async {
    if (await FlutterForegroundTask.isRunningService) {
      await update(title: title, text: text);
      return;
    }
    await FlutterForegroundTask.startService(
      serviceId: 4242,
      notificationTitle: title,
      notificationText: text,
      callback: _foregroundEntry,
    );
  }

  static Future<void> update({
    required String title,
    required String text,
  }) async {
    if (!await FlutterForegroundTask.isRunningService) return;
    await FlutterForegroundTask.updateService(
      notificationTitle: title,
      notificationText: text,
    );
  }

  static Future<void> stop() async {
    if (!await FlutterForegroundTask.isRunningService) return;
    await FlutterForegroundTask.stopService();
  }
}
