import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/theme.dart';
import '../widgets/layout.dart';
import '../widgets/viax_logo.dart';

class DocsScreen extends StatelessWidget {
  const DocsScreen({super.key});

  static const _sections = <_DocSection>[
    _DocSection(
      icon: Icons.info_outline,
      title: 'O que é o ViaX:Trace?',
      body:
          'O ViaX:Trace é um sistema SaaS de auditoria de rotas logísticas. Valida planilhas de entrega (XLSX/CSV) comparando endereços declarados pelos motoristas com coordenadas GPS capturadas durante a entrega.\n\n'
          'Quando há discrepância entre o endereço informado e a localização real do GPS, o sistema classifica o item como uma nuance — que pode indicar erro de digitação, endereço incorreto ou potencial fraude.',
    ),
    _DocSection(
      icon: Icons.warning_amber_outlined,
      title: 'O que é uma nuance?',
      body:
          'Uma nuance é detectada quando a rua/logradouro informado no endereço de entrega não corresponde (ou corresponde com baixa similaridade) à via real identificada pelas coordenadas GPS.\n\n'
          'Exemplos de nuances:\n'
          '• Endereço informa "Rua das Flores, 123" mas GPS aponta para "Av. Brasil, 123"\n'
          '• Divergência de bairro ou complemento\n'
          '• Endereço com erro de grafia\n\n'
          'Exemplos que NÃO são nuance:\n'
          '• "Rua Sinagoga, 49, Travessa B" → GPS na Travessa B (via secundária reconhecida)\n'
          '• Variações de siglas como "Av." vs "Avenida" (normalização automática)',
    ),
    _DocSection(
      icon: Icons.upload_file_outlined,
      title: 'Como processar uma planilha',
      body:
          '1. Prepare o arquivo: XLSX ou CSV com colunas de endereço e coordenadas GPS (lat/lon).\n\n'
          '2. Vá em Processar Rota e faça upload do arquivo.\n\n'
          '3. Aguarde o processamento — o progresso é exibido em tempo real.\n\n'
          '4. Revise os resultados. Cada linha é classificada como OK ou Nuance.\n\n'
          '5. Exporte o relatório final.',
    ),
    _DocSection(
      icon: Icons.grid_view_outlined,
      title: 'Formato do arquivo',
      body:
          'Colunas obrigatórias (case-insensitive):\n'
          '• endereco / address — Endereço completo\n'
          '• latitude / lat — Latitude decimal (ex: -23.5505)\n'
          '• longitude / lon / lng — Longitude decimal\n\n'
          'Colunas opcionais:\n'
          '• cidade / city\n'
          '• bairro / neighborhood\n'
          '• cep',
    ),
    _DocSection(
      icon: Icons.location_on_outlined,
      title: 'Como funciona a geocodificação',
      body:
          'Estratégia multi-camada para máxima precisão em endereços brasileiros:\n\n'
          'Camada 1 — Reversa (GPS → Rua):\n'
          '• Photon (OSM, sem rate limit)\n'
          '• Overpass API (geometria OSM precisa)\n'
          '• Nominatim (fallback)\n\n'
          'Camada 2 — Direta (Endereço → Coordenada):\n'
          '• BrasilAPI (CEP nacional)\n'
          '• Google Maps (premium opcional)\n\n'
          'Normalização inteligente de siglas, POIs e vias secundárias antes da comparação.',
    ),
    _DocSection(
      icon: Icons.help_outline,
      title: 'Perguntas frequentes',
      faqs: [
        ('Funciona em cidades pequenas?', 'Sim. Múltiplas fontes OSM têm boa cobertura no Brasil. Em áreas muito rurais a precisão pode ser menor.'),
        ('O que é o limiar de similaridade?', 'Percentual mínimo de correspondência entre rua informada e oficial. Padrão 68%.'),
        ('Por que "Travessa B" não é nuance?', 'O sistema reconhece o padrão "Logradouro de referência, número, Via de entrega".'),
        ('Quantos endereços de uma vez?', 'Sem limite fixo. Planilhas com 500+ endereços podem levar alguns minutos.'),
        ('Os dados são seguros?', 'Sim. Todo o processamento é em servidor seguro, criptografado, acessível só ao seu usuário.'),
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return AppLayout(
      currentPath: '/docs',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: context.accentDim,
              borderRadius: BorderRadius.circular(AppRadii.pill),
              border: Border.all(color: context.accent.withValues(alpha: 0.3)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.menu_book_outlined, size: 12, color: context.accent),
                const SizedBox(width: 4),
                Text('DOCUMENTAÇÃO',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: context.accent, letterSpacing: 0.6)),
              ],
            ),
          ).flexibleSelfStart(),
          const SizedBox(height: 12),
          Text('Guia do ViaX:Trace',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: -0.5, color: context.text)),
          const SizedBox(height: 6),
          Text('Tudo que você precisa saber para auditar rotas com precisão e eficiência.',
              style: TextStyle(fontSize: 13, color: context.textFaint, height: 1.6)),
          const SizedBox(height: 18),
          for (final s in _sections)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _SectionCard(section: s),
            ),
          const GitHubBanner(),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 1.5,
            children: [
              _quickLink(context, Icons.upload_file_outlined, 'Processar Rota', 'Upload de planilha', '/process'),
              _quickLink(context, Icons.history_outlined, 'Histórico', 'Análises anteriores', '/history'),
              _quickLink(context, Icons.settings_outlined, 'Configurações', 'Valor por rota, metas', '/settings'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _quickLink(BuildContext c, IconData icon, String label, String desc, String path) {
    return InkWell(
      onTap: () => c.go(path),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: c.surface,
          border: Border.all(color: c.borderStrong),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Icon(icon, color: c.accent, size: 20),
            Text(label, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: c.text)),
            Text(desc, style: TextStyle(fontSize: 10.5, color: c.textFaint)),
          ],
        ),
      ),
    );
  }
}

class _DocSection {
  final IconData icon;
  final String title;
  final String? body;
  final List<(String, String)>? faqs;
  const _DocSection({required this.icon, required this.title, this.body, this.faqs});
}

class _SectionCard extends StatefulWidget {
  final _DocSection section;
  const _SectionCard({required this.section});
  @override
  State<_SectionCard> createState() => _SectionCardState();
}

class _SectionCardState extends State<_SectionCard> {
  final _open = <int>{};
  @override
  Widget build(BuildContext context) {
    return CardSection(
      header: Row(children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(color: context.accentDim, borderRadius: BorderRadius.circular(8)),
          child: Icon(widget.section.icon, color: context.accent, size: 18),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(widget.section.title,
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: context.text)),
        ),
      ]),
      child: widget.section.faqs != null
          ? Column(
              children: [
                for (int i = 0; i < widget.section.faqs!.length; i++)
                  _faqRow(i, widget.section.faqs![i]),
              ],
            )
          : Text(widget.section.body ?? '',
              style: TextStyle(fontSize: 13, color: context.textMuted, height: 1.7)),
    );
  }

  Widget _faqRow(int i, (String, String) qa) {
    final open = _open.contains(i);
    return Container(
      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: context.border))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () => setState(() => open ? _open.remove(i) : _open.add(i)),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Row(
                children: [
                  Expanded(
                    child: Text(qa.$1,
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: context.text)),
                  ),
                  Icon(open ? Icons.remove : Icons.add, size: 16, color: context.textFaint),
                ],
              ),
            ),
          ),
          if (open)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(qa.$2, style: TextStyle(fontSize: 12.5, color: context.textMuted, height: 1.7)),
            ),
        ],
      ),
    );
  }
}

extension _SelfStart on Widget {
  Widget flexibleSelfStart() => Align(alignment: Alignment.centerLeft, child: this);
}
