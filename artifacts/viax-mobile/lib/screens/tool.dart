import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../api/sse_client.dart';
import '../theme/theme.dart';
import '../widgets/layout.dart';
import '../widgets/spinner.dart';
import '../widgets/toast.dart';

class ToolScreen extends StatefulWidget {
  const ToolScreen({super.key});
  @override
  State<ToolScreen> createState() => _ToolScreenState();
}

class _ToolScreenState extends State<ToolScreen> {
  List<Map<String, dynamic>> _condos = [];
  String _selectedId = 'bougainville-iii';
  String? _filePath;
  String? _fileName;
  int? _fileSize;
  final List<String> _steps = [];
  bool _processing = false;
  bool _loading = true;
  Map<String, dynamic>? _result;
  String _activeFilter = 'all';

  @override
  void initState() {
    super.initState();
    _loadCondos();
  }

  Future<void> _loadCondos() async {
    setState(() => _loading = true);
    try {
      final list = await context.read<ApiClient>().condominiumList();
      setState(() {
        _condos = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      });
    } catch (_) {
      _condos = [];
    } finally {
      if (mounted) setState(() => _loading = false);
    }
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
    final selected = _condos.firstWhere((c) => c['id'] == _selectedId, orElse: () => {});
    if (selected.isEmpty || _filePath == null) return;
    if (selected['status'] != 'ativo') {
      showToast(context, 'Este condomínio ainda está em desenvolvimento.');
      return;
    }
    setState(() {
      _processing = true;
      _steps.clear();
      _result = null;
    });
    final api = context.read<ApiClient>();
    try {
      await for (final ev in uploadAndStream(
        api: api,
        endpointPath: '/condominium/process',
        filePath: _filePath!,
        extraFields: {'condominioId': _selectedId},
      )) {
        if (!mounted) break;
        if (ev.event == 'step' && ev.data is Map && ev.data['step'] is String) {
          setState(() {
            _steps.add(ev.data['step'] as String);
            if (_steps.length > 30) _steps.removeAt(0);
          });
        } else if (ev.event == 'result' && ev.data is Map && ev.data['result'] is Map) {
          setState(() {
            _result = Map<String, dynamic>.from(ev.data['result'] as Map);
            _steps.add('✓ Sequência logística pronta!');
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
    final selected = _condos.firstWhere((c) => c['id'] == _selectedId, orElse: () => {});
    final canProcess = _filePath != null && !_processing && selected['status'] == 'ativo';

    return AppLayout(
      currentPath: '/tool',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Ferramenta de Condomínios',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -0.5, color: context.text)),
          const SizedBox(height: 4),
          Text('Rastreamento interno de entregas em condomínios fechados — Nova Califórnia (Tamoios).',
              style: TextStyle(fontSize: 13, color: context.textFaint, height: 1.5)),
          const SizedBox(height: 16),
          CardSection(
            header: const CardHeaderLabel('Selecionar Condomínio'),
            child: _loading
                ? const Padding(padding: EdgeInsets.all(20), child: Center(child: AppSpinner()))
                : Column(
                    children: [
                      for (final c in _condos)
                        _condoCard(c),
                    ],
                  ),
          ),
          const SizedBox(height: 16),
          CardSection(
            header: CardHeaderLabel('Importar Rota — ${selected['nome'] ?? '—'}'),
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
                          color: _filePath != null ? context.accent : context.borderStrong, width: 1.4),
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
                        Text(_fileSize == null ? 'XLSX ou CSV · máx 10MB' : '${(_fileSize! / 1024).toStringAsFixed(1)} KB',
                            style: TextStyle(fontSize: 11, color: context.textFaint),
                            textAlign: TextAlign.center),
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
                  const SizedBox(height: 14),
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

  Widget _condoCard(Map<String, dynamic> c) {
    final isActive = c['id'] == _selectedId;
    final isAvail = c['status'] == 'ativo';
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: isAvail ? () => setState(() => _selectedId = c['id']) : null,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isActive ? context.accentDim : context.surface2,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isActive ? context.accent : context.borderStrong,
              width: 1.5,
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(c['nome'] ?? '',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: context.text)),
                    const SizedBox(height: 2),
                    Text(
                      isAvail
                          ? 'Disponível${c['totalLotes'] != null ? " · ${c['totalLotes']} lotes" : ""}'
                          : 'Em desenvolvimento',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.6,
                        color: isAvail ? context.ok : context.textFaint,
                      ),
                    ),
                  ],
                ),
              ),
              if (isActive) Icon(Icons.check_circle, color: context.accent, size: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _resultPanel() {
    final r = _result!;
    final classColor = {
      'ordenada': context.ok,
      'encontrada_sem_condominio': const Color(0xFF7C3AED),
      'nuance': context.accent,
    };
    final classLabel = {
      'all': 'Todos',
      'ordenada': 'Ordenadas',
      'encontrada_sem_condominio': 'Sem condomínio',
      'nuance': 'Nuances',
    };
    final detalhes = (r['detalhes'] as List?) ?? const [];
    final filtered = detalhes.where((row) {
      if (_activeFilter == 'all') return true;
      return (row as Map)['classificacao'] == _activeFilter;
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 2.0,
          children: [
            StatTile(value: '${r['totalLinhas'] ?? 0}', label: 'Total'),
            StatTile(value: '${r['totalOrdenadas'] ?? 0}', label: 'Ordenadas', accent: context.ok),
            StatTile(
                value: '${r['totalSemCondominio'] ?? 0}',
                label: 'Sem condomínio',
                accent: const Color(0xFF7C3AED)),
            StatTile(value: '${r['totalNuances'] ?? 0}', label: 'Nuances', accent: context.accent),
          ],
        ),
        const SizedBox(height: 14),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final f in const ['all', 'ordenada', 'encontrada_sem_condominio', 'nuance'])
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: GestureDetector(
                    onTap: () => setState(() => _activeFilter = f),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: _activeFilter == f ? context.accent : context.surface2,
                        borderRadius: BorderRadius.circular(AppRadii.pill),
                        border: Border.all(
                            color: _activeFilter == f ? context.accent : context.borderStrong),
                      ),
                      child: Text(
                        classLabel[f] ?? f,
                        style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: _activeFilter == f ? Colors.white : context.textMuted),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        CardSection(
          header: CardHeaderLabel('Sequência — ${(r['condominio'] as Map?)?['nome'] ?? ''}'),
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              if (filtered.isEmpty)
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Center(child: Text('Nenhum item.', style: TextStyle(color: context.textFaint, fontSize: 13))),
                ),
              for (int i = 0; i < filtered.length && i < 200; i++)
                _row(Map<String, dynamic>.from(filtered[i] as Map), classColor, i == 0),
            ],
          ),
        ),
      ],
    );
  }

  Widget _row(Map<String, dynamic> row, Map<String, Color> colors, bool first) {
    final clsf = row['classificacao']?.toString() ?? 'nuance';
    final color = colors[clsf] ?? context.accent;
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
              child: Text(row['ordem']?.toString() ?? '—',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: color)),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${row['quadra'] != null ? "Quadra ${row['quadra']}" : "Quadra ?"}'
                  '${row['lote'] != null ? " · Lote ${row['lote']}" : ""}',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: context.text),
                ),
                if (row['instrucao'] != null) ...[
                  const SizedBox(height: 3),
                  Text('➜ ${row['instrucao']}',
                      style: TextStyle(fontSize: 11, color: context.textMuted)),
                ],
                const SizedBox(height: 3),
                Text(row['enderecoOriginal']?.toString() ?? '',
                    style: TextStyle(fontSize: 11, color: context.textFaint),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis),
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
}
