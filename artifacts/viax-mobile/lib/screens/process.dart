import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../api/sse_client.dart';
import '../state/settings_provider.dart';
import '../theme/theme.dart';
import '../widgets/layout.dart';
import '../widgets/spinner.dart';
import '../widgets/toast.dart';

class ProcessScreen extends StatefulWidget {
  const ProcessScreen({super.key});
  @override
  State<ProcessScreen> createState() => _ProcessScreenState();
}

class _ProcessScreenState extends State<ProcessScreen> {
  String? _filePath;
  String? _fileName;
  int? _fileSize;
  final List<String> _steps = [];
  bool _processing = false;
  Map<String, dynamic>? _result;
  String _activeFilter = 'all';

  @override
  void initState() {
    super.initState();
    Future.microtask(() => context.read<SettingsProvider>().load());
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['xlsx', 'csv'],
      withData: false,
    );
    if (result != null && result.files.isNotEmpty) {
      final f = result.files.first;
      setState(() {
        _filePath = f.path;
        _fileName = f.name;
        _fileSize = f.size;
        _result = null;
        _steps.clear();
      });
    }
  }

  Future<void> _process() async {
    if (_filePath == null) return;
    setState(() {
      _processing = true;
      _steps.clear();
      _result = null;
    });

    final api = context.read<ApiClient>();
    try {
      await for (final ev in uploadAndStream(api: api, endpointPath: '/process/upload', filePath: _filePath!)) {
        if (!mounted) break;
        if (ev.event == 'step' && ev.data is Map && ev.data['step'] is String) {
          setState(() {
            _steps.add(ev.data['step'] as String);
            if (_steps.length > 30) _steps.removeAt(0);
          });
        } else if (ev.event == 'result' && ev.data is Map && ev.data['result'] is Map) {
          setState(() {
            _result = Map<String, dynamic>.from(ev.data['result'] as Map);
            _steps.add('✓ Análise concluída!');
          });
        } else if (ev.event == 'error' && ev.data is Map && ev.data['error'] is String) {
          if (mounted) showToast(context, ev.data['error'] as String);
        }
      }
    } catch (e) {
      if (mounted) showToast(context, 'Erro de conexão: $e');
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<SettingsProvider>();
    final warning = _configWarning(settings);
    final canProcess = _filePath != null && !_processing && warning?['type'] != 'error';

    return AppLayout(
      currentPath: '/process',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Processar Rota',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -0.5, color: context.text)),
          const SizedBox(height: 4),
          Text('Importe um arquivo XLSX ou CSV com a coluna "Destination Address".',
              style: TextStyle(fontSize: 13, color: context.textFaint)),
          if (warning != null) ...[
            const SizedBox(height: 14),
            _warningBanner(warning),
          ],
          const SizedBox(height: 16),
          CardSection(
            header: const CardHeaderLabel('Importar Rota'),
            padding: const EdgeInsets.all(14),
            child: Column(
              children: [
                InkWell(
                  onTap: _pickFile,
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 18),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                          color: _filePath != null ? context.accent : context.borderStrong, style: BorderStyle.solid, width: 1.4),
                    ),
                    child: Column(
                      children: [
                        Container(
                          width: 52,
                          height: 52,
                          decoration: BoxDecoration(
                            color: context.accentDim,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: context.borderStrong),
                          ),
                          child: Icon(Icons.upload_file_outlined, color: context.accent, size: 26),
                        ),
                        const SizedBox(height: 10),
                        Text(_fileName ?? 'Arraste o arquivo aqui',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: context.text),
                            textAlign: TextAlign.center),
                        const SizedBox(height: 4),
                        Text(
                          _fileSize == null
                              ? 'XLSX ou CSV · coluna "Destination Address" · máx 10MB'
                              : '${(_fileSize! / 1024).toStringAsFixed(1)} KB',
                          style: TextStyle(fontSize: 11, color: context.textFaint),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: _pickFile,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: context.accent,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.pill)),
                            textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                          ),
                          child: Text(_filePath == null ? 'Selecionar arquivo' : 'Trocar arquivo'),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: context.text,
                      foregroundColor: context.bg,
                      disabledBackgroundColor: context.borderStrong,
                    ),
                    onPressed: canProcess ? _process : null,
                    child: _processing
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
                        : const Text('Iniciar'),
                  ),
                ),
                if (_processing && _steps.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  for (final s in _steps)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                              margin: const EdgeInsets.only(top: 5),
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(color: context.accent, shape: BoxShape.circle)),
                          const SizedBox(width: 8),
                          Expanded(child: Text(s, style: TextStyle(fontSize: 12, color: context.textFaint))),
                        ],
                      ),
                    ),
                ],
              ],
            ),
          ),
          if (_result != null) ...[
            const SizedBox(height: 16),
            _resultPanel(),
          ],
        ],
      ),
    );
  }

  Map<String, String>? _configWarning(SettingsProvider s) {
    if (s.instanceMode == 'googlemaps' && s.googleMapsApiKey.isEmpty) {
      return {
        'type': 'error',
        'message': 'Motor Google Maps selecionado, mas nenhuma chave de API foi configurada.',
        'action': 'Adicione sua chave em Configurações → Instâncias.',
      };
    }
    if (s.instanceMode == 'geocodebr') {
      return {
        'type': 'info',
        'message': 'Motor GeocodeR BR (CNEFE/IBGE) ativo.',
        'action': 'Microserviço R deve rodar na porta 8002.',
      };
    }
    return null;
  }

  Widget _warningBanner(Map<String, String> w) {
    final isError = w['type'] == 'error';
    final color = isError ? context.accent : const Color(0xFF7C3AED);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(isError ? Icons.error_outline : Icons.info_outline, color: color, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(w['message']!, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
                if (w['action'] != null) ...[
                  const SizedBox(height: 4),
                  Text(w['action']!, style: TextStyle(fontSize: 11, color: context.textFaint)),
                ]
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _resultPanel() {
    final r = _result!;
    final total = (r['total_enderecos'] as num?)?.toInt() ?? 0;
    final nuances = (r['total_nuances'] as num?)?.toInt() ?? 0;
    final ok = total - nuances;
    final pct = (r['percentual_problema'] as num?)?.toDouble() ?? 0.0;
    final metricas = Map<String, dynamic>.from(r['metricas_tecnicas'] ?? {});
    final geoOk = (metricas['taxa_geocode_sucesso'] as num?)?.toDouble() ?? 0.0;
    final tempoMs = (metricas['tempo_processamento_ms'] as num?)?.toInt() ?? 0;
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
            StatTile(value: '$nuances', label: 'Nuances', accent: context.accent),
            StatTile(value: '$ok', label: 'OK', accent: context.ok),
            StatTile(value: '${pct.toStringAsFixed(1)}%', label: 'Taxa', accent: pct > 20 ? context.accent : context.ok),
            StatTile(value: '${geoOk.toStringAsFixed(0)}%', label: 'Geocode', accent: context.ok),
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
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: _activeFilter == f ? context.accent : context.surface2,
                      borderRadius: BorderRadius.circular(AppRadii.pill),
                      border: Border.all(color: _activeFilter == f ? context.accent : context.borderStrong),
                    ),
                    child: Text(
                      f == 'all' ? 'Todos' : f == 'nuance' ? 'Nuances' : 'OK',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: _activeFilter == f ? Colors.white : context.textMuted,
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
                  child: Center(child: Text('Nenhum item.', style: TextStyle(color: context.textFaint, fontSize: 13))),
                ),
              for (int i = 0; i < filtered.length && i < 200; i++)
                _detailRow(Map<String, dynamic>.from(filtered[i] as Map), i == 0),
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
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Center(
              child: Text('${row['linha'] ?? '?'}',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: color)),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(AppRadii.pill),
                    ),
                    child: Text(isNuance ? 'NUANCE' : 'OK',
                        style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, letterSpacing: 0.5, color: color)),
                  ),
                  const SizedBox(width: 6),
                  Text('Similaridade $simStr',
                      style: TextStyle(fontSize: 10.5, color: context.textFaint, fontWeight: FontWeight.w600)),
                ]),
                const SizedBox(height: 4),
                Text(row['endereco_original']?.toString() ?? '',
                    style: TextStyle(fontSize: 12, color: context.text), maxLines: 2, overflow: TextOverflow.ellipsis),
                if (row['nome_rua_oficial'] != null) ...[
                  const SizedBox(height: 2),
                  Text('Oficial: ${row['nome_rua_oficial']}',
                      style: TextStyle(fontSize: 11, color: context.textFaint)),
                ],
                if (row['motivo'] != null && row['motivo'].toString().isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(row['motivo'].toString(),
                      style: TextStyle(fontSize: 10.5, color: context.textFaint, fontStyle: FontStyle.italic)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatMs(int ms) {
    if (ms < 1000) return '${ms}ms';
    final s = ms / 1000;
    if (s < 60) return '${s.toStringAsFixed(1)}s';
    return '${(s / 60).toStringAsFixed(1)}min';
  }
}
