import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../theme/theme.dart';
import '../widgets/layout.dart';
import '../widgets/spinner.dart';

class AnalysisDetailScreen extends StatefulWidget {
  final int id;
  const AnalysisDetailScreen({super.key, required this.id});

  @override
  State<AnalysisDetailScreen> createState() => _AnalysisDetailScreenState();
}

class _AnalysisDetailScreenState extends State<AnalysisDetailScreen> {
  Map<String, dynamic>? _analysis;
  Map<String, dynamic>? _result;
  bool _loading = true;
  String? _error;
  String _activeFilter = 'all';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = context.read<ApiClient>();
      final a = await api.getAnalysis(widget.id);
      Map<String, dynamic>? parsed;
      final raw = a['results'];
      if (raw is String && raw.isNotEmpty) {
        try {
          final decoded = jsonDecode(raw);
          if (decoded is Map) parsed = Map<String, dynamic>.from(decoded);
        } catch (_) {}
      }
      if (!mounted) return;
      setState(() {
        _analysis = a;
        _result = parsed;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e is ApiError && e.message.isNotEmpty
            ? e.message
            : 'Não foi possível carregar a análise.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppLayout(
      currentPath: '/history',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              IconButton(
                visualDensity: VisualDensity.compact,
                icon: Icon(Icons.arrow_back, color: context.text),
                onPressed: () => context.go('/history'),
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  _analysis?['fileName']?.toString() ?? 'Análise',
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.4,
                      color: context.text),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_loading)
            const Padding(
                padding: EdgeInsets.symmetric(vertical: 60),
                child: Center(child: AppSpinner()))
          else if (_error != null)
            CardSection(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Center(
                  child: Text(_error!,
                      textAlign: TextAlign.center,
                      style: TextStyle(color: context.textMuted, fontSize: 13)),
                ),
              ),
            )
          else if (_analysis != null) ...[
            _meta(_analysis!),
            const SizedBox(height: 12),
            if (_result != null)
              _resultPanel(_result!)
            else
              CardSection(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Center(
                    child: Text(
                        'Esta análise não tem detalhes salvos para visualizar.',
                        textAlign: TextAlign.center,
                        style:
                            TextStyle(color: context.textFaint, fontSize: 12.5)),
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }

  Widget _meta(Map<String, dynamic> a) {
    final created = DateTime.tryParse(a['createdAt']?.toString() ?? '');
    final fmt = DateFormat('dd/MM/yyyy HH:mm');
    final daysLeft = _daysUntilExpiration(created);
    return CardSection(
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Processado em',
                    style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: context.textFaint,
                        letterSpacing: 0.3)),
                const SizedBox(height: 2),
                Text(created != null ? fmt.format(created.toLocal()) : '—',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: context.text)),
              ],
            ),
          ),
          if (daysLeft != null)
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: daysLeft <= 1 ? context.accentDim : context.surface2,
                borderRadius: BorderRadius.circular(AppRadii.pill),
                border: Border.all(
                    color: daysLeft <= 1 ? context.accent : context.border),
              ),
              child: Text(
                daysLeft <= 0
                    ? 'expira hoje'
                    : daysLeft == 1
                        ? 'expira em 1 dia'
                        : 'expira em $daysLeft dias',
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: daysLeft <= 1 ? context.accent : context.textMuted),
              ),
            ),
        ],
      ),
    );
  }

  int? _daysUntilExpiration(DateTime? created) {
    if (created == null) return null;
    final expires = created.add(const Duration(days: 3));
    final ms = expires.difference(DateTime.now()).inMinutes;
    if (ms <= 0) return 0;
    return (ms / (60 * 24)).ceil();
  }

  Widget _resultPanel(Map<String, dynamic> r) {
    final total = (r['total_enderecos'] as num?)?.toInt() ?? 0;
    final nuances = (r['total_nuances'] as num?)?.toInt() ?? 0;
    final ok = total - nuances;
    final pct = (r['percentual_problema'] as num?)?.toDouble() ?? 0.0;
    final metricas = Map<String, dynamic>.from(r['metricas_tecnicas'] ?? {});
    final geoOk =
        (metricas['taxa_geocode_sucesso'] as num?)?.toDouble() ?? 0.0;
    final tempoMs =
        (metricas['tempo_processamento_ms'] as num?)?.toInt() ?? 0;
    final detalhes = (r['detalhes'] as List?) ?? const [];
    final filtered = detalhes.where((row) {
      if (_activeFilter == 'all') return true;
      final isNuance = (row as Map)['is_nuance'] == true;
      return _activeFilter == 'nuance' ? isNuance : !isNuance;
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        GridView.count(
          crossAxisCount: 3,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 1.3,
          children: [
            StatTile(value: '$total', label: 'Total'),
            StatTile(
                value: '$nuances', label: 'Nuances', accent: context.accent),
            StatTile(value: '$ok', label: 'OK', accent: context.ok),
            StatTile(
                value: '${pct.toStringAsFixed(1)}%',
                label: 'Taxa',
                accent: pct > 20 ? context.accent : context.ok),
            StatTile(
                value: '${geoOk.toStringAsFixed(0)}%',
                label: 'Geocode',
                accent: context.ok),
            StatTile(value: _formatMs(tempoMs), label: 'Tempo'),
          ],
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            for (final f in const ['all', 'nuance', 'ok'])
              Padding(
                padding: const EdgeInsets.only(right: 6),
                child: GestureDetector(
                  onTap: () => setState(() => _activeFilter = f),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: _activeFilter == f
                          ? context.accent
                          : context.surface2,
                      borderRadius: BorderRadius.circular(AppRadii.pill),
                      border: Border.all(
                          color: _activeFilter == f
                              ? context.accent
                              : context.borderStrong),
                    ),
                    child: Text(
                      f == 'all'
                          ? 'Todos'
                          : f == 'nuance'
                              ? 'Nuances'
                              : 'OK',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: _activeFilter == f
                            ? Colors.white
                            : context.textMuted,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),
        CardSection(
          header: const CardHeaderLabel('Detalhes'),
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              if (filtered.isEmpty)
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Center(
                      child: Text('Nenhum item.',
                          style: TextStyle(
                              color: context.textFaint, fontSize: 13))),
                ),
              for (int i = 0; i < filtered.length && i < 200; i++)
                _detailRow(
                    Map<String, dynamic>.from(filtered[i] as Map), i == 0),
            ],
          ),
        ),
      ],
    );
  }

  Widget _detailRow(Map<String, dynamic> row, bool first) {
    final isNuance = row['is_nuance'] == true;
    final color = isNuance ? context.accent : context.ok;
    final sim = row['similaridade'];
    final simStr = sim is num ? '${(sim * 100).toStringAsFixed(0)}%' : '—';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        border: first ? null : Border(top: BorderSide(color: context.border)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 8,
            height: 8,
            margin: const EdgeInsets.only(top: 5, right: 8),
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  row['endereco_planilha']?.toString() ??
                      row['endereco']?.toString() ??
                      '—',
                  style: TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w700, color: context.text),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if (row['endereco_geocode'] != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    row['endereco_geocode'].toString(),
                    style: TextStyle(fontSize: 10.5, color: context.textFaint),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(simStr,
              style: TextStyle(
                  fontSize: 11.5, fontWeight: FontWeight.w800, color: color)),
        ],
      ),
    );
  }

  String _formatMs(int ms) {
    if (ms < 1000) return '${ms}ms';
    final s = ms / 1000.0;
    if (s < 60) return '${s.toStringAsFixed(1)}s';
    final m = (s / 60).floor();
    final r = (s % 60).round();
    return '${m}m${r.toString().padLeft(2, '0')}s';
  }
}
