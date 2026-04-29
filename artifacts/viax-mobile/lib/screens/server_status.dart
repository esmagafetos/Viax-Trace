import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../services/haptics.dart';
import '../theme/theme.dart';
import '../widgets/layout.dart';
import '../widgets/spinner.dart';

/// Shows live status of the ViaX:Trace API and all upstream geocoding
/// providers. Auto-refreshes every 30s while the screen is visible. Reached
/// from the avatar pop-up menu (top right).
class ServerStatusScreen extends StatefulWidget {
  const ServerStatusScreen({super.key});

  @override
  State<ServerStatusScreen> createState() => _ServerStatusScreenState();
}

class _ServerStatusScreenState extends State<ServerStatusScreen> {
  Map<String, dynamic>? _providers;
  Map<String, dynamic>? _maintenance;
  bool _apiOnline = false;
  int? _apiLatencyMs;
  bool _loading = true;
  String? _error;
  Timer? _timer;
  DateTime? _lastCheck;

  @override
  void initState() {
    super.initState();
    _refresh();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _refresh());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _refresh() async {
    final api = context.read<ApiClient>();
    if (mounted) setState(() => _loading = true);
    try {
      final start = DateTime.now();
      final maintFuture = api.getMaintenance();
      final providersFuture = api.getProvidersStatus();
      final maint = await maintFuture;
      final providers = await providersFuture;
      final latency = DateTime.now().difference(start).inMilliseconds;
      if (!mounted) return;
      setState(() {
        _maintenance = maint;
        _providers = providers;
        _apiOnline = true;
        _apiLatencyMs = latency;
        _lastCheck = DateTime.now();
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _apiOnline = false;
        _apiLatencyMs = null;
        _loading = false;
        _error = 'Não foi possível alcançar o servidor.';
        _lastCheck = DateTime.now();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final maint = _maintenance;
    final maintActive = maint?['active'] == true;

    return AppLayout(
      currentPath: '/server-status',
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Status do servidor',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: context.text,
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _lastCheck == null
                            ? 'Verificando...'
                            : 'Última verificação: ${_formatTime(_lastCheck!)}',
                        style: TextStyle(fontSize: 12, color: context.textFaint),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Verificar novamente',
                  onPressed: _loading
                      ? null
                      : () {
                          AppHaptics.tap();
                          _refresh();
                        },
                  icon: _loading
                      ? const AppSpinner(size: 18)
                      : Icon(Icons.refresh, color: context.text, size: 22),
                ),
              ],
            ),
            const SizedBox(height: 16),

            if (maintActive) _maintenanceCard(context, maint!),
            if (maintActive) const SizedBox(height: 12),

            CardSection(
              header: const CardHeaderLabel('ViaX:Trace API'),
              child: _statusRow(
                context,
                label: 'Servidor backend',
                online: _apiOnline,
                latencyMs: _apiLatencyMs,
                hint: _error ?? (_apiOnline ? 'Operacional' : 'Aguarde...'),
              ),
            ),
            const SizedBox(height: 12),

            CardSection(
              header: const CardHeaderLabel('Provedores de Geocodificação'),
              child: Column(
                children: _buildProviderRows(context),
              ),
            ),
            const SizedBox(height: 16),

            Text(
              'Os status são verificados a partir do servidor — não consomem dados nem bateria do seu celular. Atualiza automaticamente a cada 30 segundos.',
              style: TextStyle(fontSize: 11, color: context.textFaint, height: 1.5),
            ),
          ],
        ),
      ),
    );
  }

  Widget _maintenanceCard(BuildContext context, Map<String, dynamic> maint) {
    final severity = (maint['severity'] as String?) ?? 'warning';
    final message = (maint['message'] as String?) ?? '';
    final color = severity == 'critical'
        ? const Color(0xFFEF4444)
        : severity == 'info'
            ? context.accent
            : const Color(0xFFF59E0B);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        border: Border.all(color: color.withValues(alpha: 0.50)),
        borderRadius: BorderRadius.circular(AppRadii.lg),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            severity == 'critical' ? Icons.error_outline : Icons.warning_amber_rounded,
            color: color,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  severity == 'critical'
                      ? 'Manutenção crítica'
                      : severity == 'info'
                          ? 'Aviso do servidor'
                          : 'Manutenção programada',
                  style: TextStyle(
                    color: color,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  message,
                  style: TextStyle(color: context.text, fontSize: 12.5, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildProviderRows(BuildContext context) {
    final providers = _providers?['providers'] as Map<String, dynamic>?;
    if (providers == null) {
      return [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Center(
            child: Text(
              _error ?? 'Carregando...',
              style: TextStyle(fontSize: 12, color: context.textFaint),
            ),
          ),
        ),
      ];
    }
    final keys = ['photon', 'nominatim', 'brasilApi', 'overpass', 'geocodebr', 'googlemaps'];
    final out = <Widget>[];
    for (var i = 0; i < keys.length; i++) {
      final p = providers[keys[i]] as Map<String, dynamic>?;
      if (p == null) continue;
      final configured = p['configured'] != false;
      final ok = configured && (p['ok'] == true);
      final latency = p['latencyMs'] as int?;
      final name = (p['name'] as String?) ?? keys[i];
      final hint = !configured
          ? 'Não configurado'
          : ok
              ? 'Operacional'
              : ((p['message'] as String?)?.isNotEmpty == true
                  ? (p['message'] as String)
                  : 'Indisponível');
      out.add(_statusRow(
        context,
        label: name,
        online: ok,
        latencyMs: configured ? latency : null,
        hint: hint,
        muted: !configured,
      ));
      if (i < keys.length - 1) {
        out.add(Divider(color: context.border, height: 1));
      }
    }
    return out;
  }

  Widget _statusRow(
    BuildContext context, {
    required String label,
    required bool online,
    required int? latencyMs,
    required String hint,
    bool muted = false,
  }) {
    final color = muted
        ? context.textFaint
        : online
            ? const Color(0xFF10B981)
            : const Color(0xFFEF4444);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Container(
            width: 9,
            height: 9,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
              boxShadow: muted
                  ? null
                  : [BoxShadow(color: color.withValues(alpha: 0.45), blurRadius: 6, spreadRadius: 1)],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: muted ? context.textFaint : context.text,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  hint,
                  style: TextStyle(fontSize: 11, color: context.textFaint),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          if (latencyMs != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: context.surface2,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: context.border),
              ),
              child: Text(
                '${latencyMs}ms',
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                  color: context.textMuted,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
        ],
      ),
    );
  }

  String _formatTime(DateTime t) {
    final h = t.hour.toString().padLeft(2, '0');
    final m = t.minute.toString().padLeft(2, '0');
    final s = t.second.toString().padLeft(2, '0');
    return '$h:$m:$s';
  }
}
