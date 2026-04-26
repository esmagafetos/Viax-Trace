import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../theme/theme.dart';
import '../widgets/layout.dart';
import '../widgets/spinner.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _summary;
  List<dynamic>? _recent;
  Map<String, dynamic>? _financial;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final api = context.read<ApiClient>();
    try {
      final results = await Future.wait([
        api.dashboardSummary(),
        api.dashboardRecent(),
        api.dashboardFinancial(),
      ]);
      _summary = results[0] as Map<String, dynamic>;
      _recent = results[1] as List<dynamic>;
      _financial = results[2] as Map<String, dynamic>;
    } catch (_) {
      // ignore
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppLayout(
      currentPath: '/dashboard',
      child: _loading
          ? Padding(padding: const EdgeInsets.all(40), child: Center(child: AppSpinner()))
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _header(context),
                const SizedBox(height: 18),
                _statGrid(),
                const SizedBox(height: 18),
                _financialSection(),
                const SizedBox(height: 18),
                _recentSection(),
              ],
            ),
    );
  }

  Widget _header(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Painel',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -0.5, color: context.text)),
        const SizedBox(height: 4),
        Text('Visão geral das suas auditorias.',
            style: TextStyle(fontSize: 13, color: context.textFaint)),
      ],
    );
  }

  Widget _statGrid() {
    final s = _summary ?? {};
    final tiles = [
      StatTile(value: '${s['totalAnalyses'] ?? 0}', label: 'Análises'),
      StatTile(value: '${s['totalAddressesProcessed'] ?? 0}', label: 'Endereços'),
      StatTile(
        value: '${(((s['avgNuanceRate'] as num?) ?? 0).toDouble()).toStringAsFixed(1)}',
        label: 'Nuances/análise',
        accent: context.accent,
      ),
      StatTile(
        value: '${(((s['avgGeocodeSuccess'] as num?) ?? 0).toDouble()).toStringAsFixed(1)}',
        label: 'Geocode OK',
        accent: context.ok,
      ),
      StatTile(
        value: '${(((s['avgSimilarity'] as num?) ?? 0).toDouble() * 100).toStringAsFixed(1)}%',
        label: 'Similaridade',
      ),
      StatTile(value: '${s['analysesThisMonth'] ?? 0}', label: 'Este mês'),
    ];
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 1.7,
      children: tiles,
    );
  }

  Widget _financialSection() {
    final f = _financial ?? {};
    final fmt = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
    final receita = (f['receitaEstimada'] as num?) ?? 0;
    final despesas = (f['despesasFixas'] as num?) ?? 0;
    final lucro = (f['lucroBruto'] as num?) ?? 0;
    final pctMeta = f['percentualMeta'];
    final grafico = (f['graficoDiario'] as List?) ?? const [];

    return CardSection(
      header: const CardHeaderLabel('Financeiro do ciclo'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _kv('Receita', fmt.format(receita), color: context.ok),
              _kv('Despesas', fmt.format(despesas)),
              _kv('Lucro', fmt.format(lucro), color: lucro >= 0 ? context.ok : context.accent),
              _kv('Rotas no ciclo', '${f['rotasCicloAtual'] ?? 0}'),
              if (pctMeta != null) _kv('Meta', '${pctMeta.toString()}%'),
            ],
          ),
          if (grafico.isNotEmpty) ...[
            const SizedBox(height: 18),
            SizedBox(
              height: 180,
              child: LineChart(
                LineChartData(
                  gridData: FlGridData(show: true, drawVerticalLine: false, getDrawingHorizontalLine: (_) => FlLine(color: context.border, strokeWidth: 1)),
                  borderData: FlBorderData(show: false),
                  titlesData: FlTitlesData(
                    leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 26,
                        getTitlesWidget: (value, meta) {
                          final i = value.toInt();
                          if (i < 0 || i >= grafico.length) return const SizedBox();
                          if (i % 5 != 0 && i != grafico.length - 1) return const SizedBox();
                          final d = grafico[i]['data']?.toString() ?? '';
                          final dd = d.length >= 10 ? d.substring(8, 10) : '';
                          return Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(dd, style: TextStyle(fontSize: 10, color: context.textFaint)),
                          );
                        },
                      ),
                    ),
                  ),
                  lineBarsData: [
                    LineChartBarData(
                      spots: [
                        for (int i = 0; i < grafico.length; i++)
                          FlSpot(i.toDouble(), ((grafico[i]['receita'] as num?) ?? 0).toDouble()),
                      ],
                      isCurved: true,
                      color: context.accent,
                      barWidth: 2.5,
                      dotData: const FlDotData(show: false),
                      belowBarData: BarAreaData(show: true, color: context.accentDim),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _kv(String label, String value, {Color? color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: context.surface2,
        borderRadius: BorderRadius.circular(AppRadii.sm),
        border: Border.all(color: context.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label.toUpperCase(),
              style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: context.textFaint, letterSpacing: 0.6)),
          const SizedBox(height: 2),
          Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: color ?? context.text)),
        ],
      ),
    );
  }

  Widget _recentSection() {
    final items = _recent ?? const [];
    return CardSection(
      header: Row(
        children: [
          const CardHeaderLabel('Análises recentes'),
          const Spacer(),
          GestureDetector(
            onTap: () => context.go('/history'),
            child: Text('Ver todas →',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: context.accent)),
          ),
        ],
      ),
      child: items.isEmpty
          ? Padding(
              padding: const EdgeInsets.symmetric(vertical: 18),
              child: Center(
                child: Text('Nenhuma análise ainda. Processe sua primeira rota.',
                    style: TextStyle(fontSize: 13, color: context.textFaint)),
              ),
            )
          : Column(
              children: [
                for (final a in items)
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      border: Border(bottom: BorderSide(color: context.border)),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('${a['fileName'] ?? '—'}',
                                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: context.text),
                                  overflow: TextOverflow.ellipsis),
                              const SizedBox(height: 2),
                              Text(
                                '${a['totalAddresses'] ?? 0} endereços · ${a['createdAt'].toString().substring(0, 10)}',
                                style: TextStyle(fontSize: 11, color: context.textFaint),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: ((a['nuances'] ?? 0) as int) > 0 ? context.accentDim : context.okDim,
                            borderRadius: BorderRadius.circular(AppRadii.pill),
                          ),
                          child: Text('${a['nuances']} nuances',
                              style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: ((a['nuances'] ?? 0) as int) > 0 ? context.accent : context.ok)),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
    );
  }
}
