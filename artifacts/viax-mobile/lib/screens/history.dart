import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../theme/theme.dart';
import '../widgets/layout.dart';
import '../widgets/spinner.dart';
import '../widgets/toast.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});
  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  int _page = 1;
  final int _limit = 10;
  Map<String, dynamic>? _data;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      _data = await context.read<ApiClient>().listAnalyses(page: _page, limit: _limit);
    } catch (_) {
      _data = null;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _delete(int id) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: context.surface,
        title: Text('Excluir análise?', style: TextStyle(color: context.text)),
        content: Text('Esta ação não pode ser desfeita.', style: TextStyle(color: context.textMuted)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Excluir', style: TextStyle(color: context.accent)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await context.read<ApiClient>().deleteAnalysis(id);
      if (mounted) {
        showToast(context, 'Análise excluída.', success: true);
        _load();
      }
    } catch (_) {
      if (mounted) showToast(context, 'Erro ao excluir.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = ((_data?['items'] as List?) ?? const []);
    final total = (_data?['total'] as num?)?.toInt() ?? 0;
    final totalPages = (total / _limit).ceil();
    final fmt = DateFormat('dd/MM HH:mm');

    return AppLayout(
      currentPath: '/history',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Histórico de Análises',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -0.5, color: context.text)),
          const SizedBox(height: 4),
          Text(
            total > 0 ? '$total análise${total != 1 ? "s" : ""} encontrada${total != 1 ? "s" : ""}' : 'Nenhuma análise ainda.',
            style: TextStyle(fontSize: 13, color: context.textFaint),
          ),
          const SizedBox(height: 16),
          if (_loading)
            const Padding(padding: EdgeInsets.symmetric(vertical: 60), child: Center(child: AppSpinner()))
          else if (items.isEmpty)
            CardSection(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Center(
                  child: Text('Nenhuma análise encontrada.',
                      style: TextStyle(fontSize: 13, color: context.textFaint)),
                ),
              ),
            )
          else
            CardSection(
              header: const CardHeaderLabel('Análises'),
              padding: EdgeInsets.zero,
              child: Column(
                children: [
                  for (int i = 0; i < items.length; i++)
                    _historyRow(Map<String, dynamic>.from(items[i] as Map), i == 0, fmt),
                ],
              ),
            ),
          if (totalPages > 1) ...[
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Página $_page de $totalPages', style: TextStyle(fontSize: 12, color: context.textFaint)),
                Row(
                  children: [
                    OutlinedButton(
                      onPressed: _page <= 1
                          ? null
                          : () {
                              setState(() => _page--);
                              _load();
                            },
                      child: const Text('Anterior'),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton(
                      onPressed: _page >= totalPages
                          ? null
                          : () {
                              setState(() => _page++);
                              _load();
                            },
                      child: const Text('Próxima'),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _historyRow(Map<String, dynamic> a, bool first, DateFormat fmt) {
    final nuances = (a['nuances'] as num?)?.toInt() ?? 0;
    final created = DateTime.tryParse(a['createdAt']?.toString() ?? '');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(border: first ? null : Border(top: BorderSide(color: context.border))),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(a['fileName']?.toString() ?? '',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: context.text),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  children: [
                    _chip('${a['totalAddresses']}', 'endereços'),
                    _chip('${a['geocodeSuccess']}', 'geo'),
                    _chip('${(((a['similarityAvg'] as num?) ?? 0) * 100).toStringAsFixed(0)}%', 'sim'),
                  ],
                ),
                const SizedBox(height: 4),
                Text(created != null ? fmt.format(created.toLocal()) : '',
                    style: TextStyle(fontSize: 10.5, color: context.textFaint)),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: nuances > 0 ? context.accentDim : context.okDim,
                  borderRadius: BorderRadius.circular(AppRadii.pill),
                ),
                child: Text('$nuances nuances',
                    style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: nuances > 0 ? context.accent : context.ok)),
              ),
              IconButton(
                visualDensity: VisualDensity.compact,
                onPressed: () => _delete((a['id'] as num).toInt()),
                icon: Icon(Icons.delete_outline, color: context.textFaint, size: 18),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _chip(String value, String label) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: context.surface2,
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: context.border),
        ),
        child: Text('$value $label',
            style: TextStyle(fontSize: 9.5, color: context.textMuted, fontWeight: FontWeight.w600)),
      );
}
