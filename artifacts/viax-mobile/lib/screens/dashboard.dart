import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../state/auth_provider.dart';
import '../theme/theme.dart';
import '../widgets/brand_mark.dart';
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
  bool _loadingSummary = true;
  bool _loadingRecent = true;
  bool _loadingFinancial = true;
  bool _heroDismissed = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final api = context.read<ApiClient>();
    api.dashboardSummary().then((v) {
      if (mounted) setState(() { _summary = v; _loadingSummary = false; });
    }).catchError((_) {
      if (mounted) setState(() => _loadingSummary = false);
    });
    api.dashboardRecent().then((v) {
      if (mounted) setState(() { _recent = v; _loadingRecent = false; });
    }).catchError((_) {
      if (mounted) setState(() => _loadingRecent = false);
    });
    api.dashboardFinancial().then((v) {
      if (mounted) setState(() { _financial = v; _loadingFinancial = false; });
    }).catchError((_) {
      if (mounted) setState(() => _loadingFinancial = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final firstName = (user?.name.split(' ').first.isNotEmpty ?? false)
        ? user!.name.split(' ').first
        : 'usuário';

    return AppLayout(
      currentPath: '/dashboard',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (!_heroDismissed)
            _HeroBanner(
              userName: firstName,
              onDismiss: () => setState(() => _heroDismissed = true),
              onPrimary: () => context.go('/process'),
            ),
          if (!_heroDismissed) const SizedBox(height: 18),
          _header(context),
          const SizedBox(height: 18),
          if (_loadingSummary)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 32),
              child: Center(child: AppSpinner()),
            )
          else if (_summary != null)
            _statGrid(_summary!),
          const SizedBox(height: 18),
          if (!_loadingFinancial) _financialPanel(_financial),
          const SizedBox(height: 18),
          _quickActions(context),
          const SizedBox(height: 18),
          _recentSection(),
        ],
      ),
    );
  }

  Widget _header(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Dashboard',
              style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.4,
                  color: context.text)),
          const SizedBox(height: 4),
          Text('Resumo das suas análises e controle financeiro de rotas.',
              style: TextStyle(fontSize: 13, color: context.textFaint)),
        ],
      );

  Widget _statGrid(Map<String, dynamic> s) {
    final totalAddresses = (s['totalAddressesProcessed'] as num?) ?? 0;
    final avgNuanceRate = ((s['avgNuanceRate'] as num?) ?? 0).toDouble();
    final avgSimilarity = ((s['avgSimilarity'] as num?) ?? 0).toDouble();

    final nuancesPct = (avgNuanceRate / (totalAddresses > 0 ? totalAddresses : 1) * 100).round();
    final simPct = (avgSimilarity * 100).round();
    final fmtBR = NumberFormat.decimalPattern('pt_BR');

    final tiles = <Widget>[
      _StatTile(value: '${s['totalAnalyses'] ?? 0}', label: 'Análises'),
      _StatTile(value: fmtBR.format(totalAddresses.toInt()), label: 'Endereços', good: true),
      _StatTile(value: '$nuancesPct%', label: 'Nuances', accent: true),
      _StatTile(value: '$simPct%', label: 'Similaridade', good: true),
      _StatTile(value: '${s['analysesThisMonth'] ?? 0}', label: 'Este Mês'),
    ];

    return LayoutBuilder(
      builder: (ctx, c) {
        final cols = c.maxWidth > 540 ? 5 : c.maxWidth > 360 ? 3 : 2;
        return GridView.count(
          crossAxisCount: cols,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 1.45,
          children: tiles,
        );
      },
    );
  }

  Widget _financialPanel(Map<String, dynamic>? f) {
    if (f == null) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: context.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: context.borderStrong),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Controle Financeiro',
                style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: context.text)),
            const SizedBox(height: 6),
            Text(
              'Configure seu valor por rota e ciclo de pagamento para ver estimativas de receita e controle de despesas.',
              style: TextStyle(fontSize: 12, color: context.textFaint, height: 1.5),
            ),
            const SizedBox(height: 14),
            ElevatedButton(
              onPressed: () => context.go('/settings'),
              style: ElevatedButton.styleFrom(shape: const StadiumBorder(), backgroundColor: context.accent),
              child: const Text('Configurar agora', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      );
    }
    final fmtBRL = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
    final hasValor = f['valorPorRota'] != null;

    if (!hasValor) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: context.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: context.borderStrong),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Controle Financeiro',
                style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: context.text)),
            const SizedBox(height: 6),
            Text(
              'Configure seu valor por rota e ciclo de pagamento para ver estimativas de receita e controle de despesas.',
              style: TextStyle(fontSize: 12, color: context.textFaint, height: 1.5),
            ),
            const SizedBox(height: 14),
            ElevatedButton(
              onPressed: () => context.go('/settings'),
              style: ElevatedButton.styleFrom(shape: const StadiumBorder(), backgroundColor: context.accent),
              child: const Text('Configurar agora', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      );
    }

    final ciclo = f['cicloPagamentoDias'] == 7
        ? 'semanal'
        : f['cicloPagamentoDias'] == 14
            ? 'quinzenal'
            : 'mensal';
    final inicioStr = (f['inicioDoCliclo'] ?? '').toString();
    final fimStr = (f['fimDoCiclo'] ?? '').toString();
    final receita = ((f['receitaEstimada'] as num?) ?? 0).toDouble();
    final despesas = ((f['despesasFixas'] as num?) ?? 0).toDouble();
    final lucro = ((f['lucroBruto'] as num?) ?? 0).toDouble();
    final rotas = (f['rotasCicloAtual'] as num?) ?? 0;
    final valorPorRota = (f['valorPorRota'] as num?)?.toDouble();
    final metaPct = ((f['percentualMeta'] as num?) ?? 0).toInt();
    final hasMeta = (f['metaRotas'] as num?) != null && ((f['metaRotas'] as num?) ?? 0) > 0;
    final grafico = (f['graficoDiario'] as List?) ?? const [];

    return Container(
      decoration: BoxDecoration(
        color: context.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.borderStrong),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(border: Border(bottom: BorderSide(color: context.border))),
            child: Row(
              children: [
                Expanded(
                  child: Text('CICLO ${ciclo.toUpperCase()} · FINANCEIRO',
                      style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.0,
                          color: context.textMuted)),
                ),
                Text(_dateRange(inicioStr, fimStr),
                    style: TextStyle(fontSize: 10.5, color: context.textFaint)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(
                      child: _moneyCell(
                          'Receita\nEstimada', fmtBRL.format(receita), context.ok),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _moneyCell('Despesas\nFixas', fmtBRL.format(despesas),
                          context.accent),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                _lucroBrutoCell(
                  fmtBRL.format(lucro),
                  lucro >= 0 ? context.ok : context.accent,
                ),
                const SizedBox(height: 18),
                LayoutBuilder(builder: (ctx, c) {
                  final wide = c.maxWidth > 520;
                  final routesCol = Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('ROTAS NO CICLO',
                          style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.8,
                              color: context.textFaint)),
                      const SizedBox(height: 6),
                      Text('$rotas',
                          style: TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -1,
                              height: 1,
                              color: context.text)),
                      if (valorPorRota != null) ...[
                        const SizedBox(height: 4),
                        Text('× ${fmtBRL.format(valorPorRota)}/rota',
                            style: TextStyle(fontSize: 11, color: context.textFaint)),
                      ],
                      if (hasMeta) ...[
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Text('META',
                                style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.6,
                                    color: context.textFaint)),
                            const Spacer(),
                            Text('$metaPct%',
                                style: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w700,
                                    color: metaPct >= 100 ? context.ok : context.accent)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Stack(
                          children: [
                            Container(
                              height: 4,
                              decoration: BoxDecoration(
                                color: context.borderStrong,
                                borderRadius: BorderRadius.circular(2),
                              ),
                            ),
                            FractionallySizedBox(
                              widthFactor: (metaPct.clamp(0, 100)) / 100.0,
                              child: Container(
                                height: 4,
                                decoration: BoxDecoration(
                                  color: metaPct >= 100 ? context.ok : context.accent,
                                  borderRadius: BorderRadius.circular(2),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text('${f['metaRotas'] ?? 0} rotas alvo',
                            style: TextStyle(fontSize: 10.5, color: context.textFaint)),
                      ],
                    ],
                  );

                  final chartCol = Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('ATIVIDADE DO CICLO',
                          style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.8,
                              color: context.textFaint)),
                      const SizedBox(height: 8),
                      _MiniBarChart(data: grafico),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(_shortDate(inicioStr),
                              style: TextStyle(fontSize: 10, color: context.textFaint)),
                          Text('hoje',
                              style: TextStyle(fontSize: 10, color: context.textFaint)),
                        ],
                      ),
                    ],
                  );

                  if (wide) {
                    return Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(child: routesCol),
                        const SizedBox(width: 16),
                        Expanded(child: chartCol),
                      ],
                    );
                  }
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [routesCol, const SizedBox(height: 18), chartCol],
                  );
                }),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _moneyCell(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: context.surface2,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: context.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(value,
                style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: color,
                    letterSpacing: -0.3,
                    height: 1.1)),
          ),
          const SizedBox(height: 5),
          Text(label.toUpperCase(),
              style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                  height: 1.2,
                  color: context.textFaint)),
        ],
      ),
    );
  }

  Widget _lucroBrutoCell(String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('LUCRO BRUTO',
                    style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.6,
                        color: context.textFaint)),
                const SizedBox(height: 5),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(value,
                      style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: color,
                          letterSpacing: -0.5,
                          height: 1.1)),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Icons.trending_up_rounded, color: color, size: 18),
          ),
        ],
      ),
    );
  }

  Widget _quickActions(BuildContext context) => Wrap(
        spacing: 10,
        runSpacing: 8,
        children: [
          ElevatedButton.icon(
            onPressed: () => context.go('/process'),
            icon: const Icon(Icons.upload_file_outlined, size: 16),
            label: const Text('Nova Análise', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            style: ElevatedButton.styleFrom(
              shape: const StadiumBorder(),
              backgroundColor: context.accent,
              foregroundColor: Colors.white,
              elevation: 0,
            ),
          ),
          OutlinedButton(
            onPressed: () => context.go('/history'),
            style: OutlinedButton.styleFrom(
              shape: const StadiumBorder(),
              side: BorderSide(color: context.borderStrong),
              foregroundColor: context.textMuted,
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            ),
            child: const Text('Ver Histórico',
                style: TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
          ),
        ],
      );

  Widget _recentSection() {
    final items = _recent ?? const [];
    return Container(
      decoration: BoxDecoration(
        color: context.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.borderStrong),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(border: Border(bottom: BorderSide(color: context.border))),
            child: Row(
              children: [
                Text('ANÁLISES RECENTES',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.0,
                        color: context.textMuted)),
                const Spacer(),
                GestureDetector(
                  onTap: () => context.go('/history'),
                  child: Text('Ver todas →',
                      style: TextStyle(
                          fontSize: 11.5, color: context.accent, fontWeight: FontWeight.w500)),
                ),
              ],
            ),
          ),
          if (_loadingRecent)
            const Padding(padding: EdgeInsets.all(32), child: Center(child: AppSpinner()))
          else if (items.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
              child: Center(
                child: Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 4,
                  children: [
                    Text('Nenhuma análise ainda. ',
                        style: TextStyle(fontSize: 13, color: context.textFaint)),
                    GestureDetector(
                      onTap: () => context.go('/process'),
                      child: Text('Processar primeira rota',
                          style: TextStyle(
                              fontSize: 13, color: context.accent, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
              ),
            )
          else
            for (int i = 0; i < items.length; i++)
              _recentRow(items[i] as Map<String, dynamic>, last: i == items.length - 1),
        ],
      ),
    );
  }

  Widget _recentRow(Map<String, dynamic> a, {required bool last}) {
    final nuances = (a['nuances'] as num?)?.toInt() ?? 0;
    final status = (a['status'] ?? '').toString();
    final isDone = status == 'done';
    final created = (a['createdAt'] ?? '').toString();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        border: last ? null : Border(bottom: BorderSide(color: context.border)),
      ),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: Text(
              (a['fileName'] ?? '—').toString(),
              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w500, color: context.text),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 8),
          Text('${a['totalAddresses'] ?? 0}',
              style: TextStyle(fontSize: 12.5, color: context.textMuted)),
          const SizedBox(width: 12),
          _badge(
            text: '$nuances',
            color: nuances > 0 ? context.accent : context.ok,
            bg: nuances > 0 ? context.accentDim : context.okDim,
          ),
          const SizedBox(width: 8),
          _badge(
            text: isDone ? 'Concluído' : status,
            color: isDone ? context.ok : context.accent,
            bg: isDone ? context.okDim : context.accentDim,
          ),
          const SizedBox(width: 8),
          Text(_shortDateTime(created),
              style: TextStyle(fontSize: 11, color: context.textFaint)),
        ],
      ),
    );
  }

  Widget _badge({required String text, required Color color, required Color bg}) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(99)),
        child: Text(text,
            style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: color)),
      );

  String _shortDate(String iso) {
    if (iso.length < 10) return '';
    try {
      final d = DateTime.parse(iso);
      return DateFormat('dd MMM', 'pt_BR').format(d);
    } catch (_) {
      return iso.substring(0, 10);
    }
  }

  String _shortDateTime(String iso) {
    if (iso.isEmpty) return '';
    try {
      final d = DateTime.parse(iso);
      return DateFormat('dd/MM HH:mm', 'pt_BR').format(d);
    } catch (_) {
      return iso.length >= 10 ? iso.substring(0, 10) : iso;
    }
  }

  String _dateRange(String inicio, String fim) {
    final a = _shortDate(inicio);
    final b = _shortDate(fim);
    if (a.isEmpty && b.isEmpty) return '';
    return '$a – $b';
  }
}

// ── Hero Banner ────────────────────────────────────────────────────────────
class _HeroBanner extends StatelessWidget {
  final String userName;
  final VoidCallback onDismiss;
  final VoidCallback onPrimary;
  const _HeroBanner({
    required this.userName,
    required this.onDismiss,
    required this.onPrimary,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Stack(
        children: [
          Container(
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFF1A0E08),
                  Color(0xFF2D1408),
                  Color(0xFF3D1C0C),
                  Color(0xFF1F0A18),
                ],
                stops: [0.0, 0.4, 0.7, 1.0],
              ),
              border: Border.all(color: const Color(0x33D4521A)),
            ),
            child: CustomPaint(
              painter: _HeroBackgroundPainter(),
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const BrandLockup(
                          markSize: 28,
                          wordmarkSize: 18,
                          showSubtitle: true,
                          horizontal: true,
                          dark: true,
                        ),
                        const Spacer(),
                        InkWell(
                          onTap: onDismiss,
                          borderRadius: BorderRadius.circular(99),
                          child: Padding(
                            padding: const EdgeInsets.all(4),
                            child: Icon(Icons.close,
                                size: 16, color: Colors.white.withValues(alpha: 0.45)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 8,
                      runSpacing: 4,
                      children: [
                        Text('Olá, $userName!',
                            style: const TextStyle(
                                fontSize: 14.5,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFFF0EDE8))),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0x40D4521A),
                            borderRadius: BorderRadius.circular(99),
                            border: Border.all(color: const Color(0x66D4521A)),
                          ),
                          child: const Text('v8.0',
                              style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.8,
                                  color: Color(0xFFE8A882))),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Geocodificação multi-camada · Detecção de nuances avançada · Suporte a Travessa e Passagem',
                      style: TextStyle(
                          fontSize: 12, color: Colors.white.withValues(alpha: 0.5), height: 1.4),
                    ),
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      height: 42,
                      child: ElevatedButton.icon(
                        onPressed: onPrimary,
                        icon: const Icon(Icons.upload_file, size: 15),
                        label: const Text('Nova Análise',
                            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                        style: ElevatedButton.styleFrom(
                          shape: const StadiumBorder(),
                          backgroundColor: const Color(0xFFD4521A),
                          foregroundColor: Colors.white,
                          elevation: 0,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroBackgroundPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // Soft accent blobs (mirrors web's radial-gradient circles)
    final blobPaint1 = Paint()
      ..shader = RadialGradient(colors: [
        const Color(0x4DD4521A),
        const Color(0x00D4521A),
      ]).createShader(Rect.fromCircle(
          center: Offset(size.width * 0.85, -40), radius: 130));
    canvas.drawCircle(Offset(size.width * 0.85, -40), 130, blobPaint1);

    final blobPaint2 = Paint()
      ..shader = RadialGradient(colors: [
        const Color(0x26D4521A),
        const Color(0x00D4521A),
      ]).createShader(Rect.fromCircle(
          center: Offset(40, size.height + 30), radius: 90));
    canvas.drawCircle(Offset(40, size.height + 30), 90, blobPaint2);

    // Dashed route line — mimics the SVG path in the web hero
    final stroke = Paint()
      ..color = Colors.white.withValues(alpha: 0.06)
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;
    final dash = Path();
    final cy = size.height / 2;
    dash.moveTo(0, cy);
    dash.cubicTo(size.width * 0.18, cy - 30,
        size.width * 0.35, cy + 28, size.width * 0.55, cy);
    dash.cubicTo(size.width * 0.72, cy - 22,
        size.width * 0.88, cy + 18, size.width, cy - 14);
    _drawDashedPath(canvas, dash, stroke, dashWidth: 6, gapWidth: 8);
  }

  void _drawDashedPath(Canvas c, Path source, Paint p,
      {double dashWidth = 6, double gapWidth = 6}) {
    for (final metric in source.computeMetrics()) {
      double dist = 0.0;
      while (dist < metric.length) {
        final next = (dist + dashWidth).clamp(0.0, metric.length);
        c.drawPath(metric.extractPath(dist, next), p);
        dist = next + gapWidth;
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// ── Stat tile ──────────────────────────────────────────────────────────────
class _StatTile extends StatelessWidget {
  final String value;
  final String label;
  final bool accent;
  final bool good;
  const _StatTile({
    required this.value,
    required this.label,
    this.accent = false,
    this.good = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = accent ? context.accent : good ? context.ok : context.text;
    final stripe = accent ? context.accent : good ? context.ok : context.border;
    return Container(
      decoration: BoxDecoration(
        color: context.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.borderStrong),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerLeft,
                    child: Text(value,
                        style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.4,
                            height: 1.0,
                            color: color)),
                  ),
                  const SizedBox(height: 4),
                  Text(label.toUpperCase(),
                      style: TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.6,
                          color: context.textFaint)),
                ],
              ),
            ),
          ),
          Container(height: 2, color: stripe),
        ],
      ),
    );
  }
}

// ── Mini bar chart ─────────────────────────────────────────────────────────
class _MiniBarChart extends StatelessWidget {
  final List<dynamic> data;
  const _MiniBarChart({required this.data});

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) {
      return Container(
        height: 64,
        alignment: Alignment.center,
        child: Text('Sem atividade neste ciclo ainda.',
            style: TextStyle(fontSize: 11, color: context.textFaint)),
      );
    }
    final visible = data.length > 20 ? data.sublist(data.length - 20) : data;
    final maxR = visible
        .map((d) => ((d as Map)['rotas'] as num?)?.toDouble() ?? 0)
        .fold<double>(1.0, (a, b) => b > a ? b : a);
    final today = DateTime.now().toIso8601String().substring(0, 10);

    return SizedBox(
      height: 64,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          for (final d in visible)
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 1.5),
                child: Builder(builder: (ctx) {
                  final m = d as Map;
                  final rotas = ((m['rotas'] as num?) ?? 0).toDouble();
                  final h = ((rotas / (maxR == 0 ? 1 : maxR)) * 56).clamp(2.0, 56.0);
                  final isToday = (m['data']?.toString() ?? '') == today;
                  final hasRotas = rotas > 0;
                  return Container(
                    height: h,
                    decoration: BoxDecoration(
                      color: isToday
                          ? context.accent
                          : hasRotas
                              ? context.ok
                              : context.border,
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(2)),
                    ),
                  );
                }),
              ),
            ),
        ],
      ),
    );
  }
}
