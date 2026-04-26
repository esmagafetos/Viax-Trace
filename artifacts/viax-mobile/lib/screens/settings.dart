import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../state/auth_provider.dart';
import '../state/server_config.dart';
import '../state/settings_provider.dart';
import '../theme/theme.dart';
import '../widgets/layout.dart';
import '../widgets/spinner.dart';
import '../widgets/toast.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  String _activeTab = 'perfil';
  final _name = TextEditingController();
  String _birthDate = '';

  final _currentPwd = TextEditingController();
  final _newPwd = TextEditingController();
  final _confirmPwd = TextEditingController();

  String _parserMode = 'builtin';
  String _aiProvider = '';
  final _aiApiKey = TextEditingController();
  double _toleranceMeters = 300;
  String _instanceMode = 'builtin';
  final _googleMapsKey = TextEditingController();
  final _valorPorRota = TextEditingController();
  int _cicloPagamentoDias = 30;
  final _metaMensalRotas = TextEditingController();
  final _despesasFixasMensais = TextEditingController();

  bool _avatarUploading = false;
  bool _savingProfile = false;
  bool _savingPwd = false;
  bool _savingSettings = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      await context.read<SettingsProvider>().load();
      _hydrate();
      final u = context.read<AuthProvider>().user;
      _name.text = u?.name ?? '';
      _birthDate = u?.birthDate ?? '';
      if (mounted) setState(() {});
    });
  }

  void _hydrate() {
    final s = context.read<SettingsProvider>().data ?? {};
    _parserMode = (s['parserMode'] as String?) ?? 'builtin';
    _aiProvider = (s['aiProvider'] as String?) ?? '';
    _aiApiKey.text = (s['aiApiKey'] as String?) ?? '';
    _toleranceMeters = ((s['toleranceMeters'] as num?) ?? 300).toDouble();
    _instanceMode = (s['instanceMode'] as String?) ?? 'builtin';
    _googleMapsKey.text = (s['googleMapsApiKey'] as String?) ?? '';
    _valorPorRota.text = s['valorPorRota'] != null ? '${s['valorPorRota']}' : '';
    _cicloPagamentoDias = ((s['cicloPagamentoDias'] as num?) ?? 30).toInt();
    _metaMensalRotas.text = s['metaMensalRotas'] != null ? '${s['metaMensalRotas']}' : '';
    _despesasFixasMensais.text = s['despesasFixasMensais'] != null ? '${s['despesasFixasMensais']}' : '';
  }

  Future<void> _pickBirthDate() async {
    final now = DateTime.now();
    final initial = DateTime.tryParse(_birthDate.isEmpty ? '${now.year - 25}-01-01' : _birthDate) ?? DateTime(now.year - 25);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1920),
      lastDate: now,
    );
    if (picked != null) {
      setState(() => _birthDate =
          '${picked.year.toString().padLeft(4, "0")}-${picked.month.toString().padLeft(2, "0")}-${picked.day.toString().padLeft(2, "0")}');
    }
  }

  Future<void> _saveProfile() async {
    setState(() => _savingProfile = true);
    try {
      final res = await context
          .read<ApiClient>()
          .updateProfile(name: _name.text.trim(), birthDate: _birthDate);
      context.read<AuthProvider>().setUser(AppUser.fromJson(res));
      if (mounted) showToast(context, 'Perfil atualizado!', success: true);
    } catch (_) {
      if (mounted) showToast(context, 'Erro ao atualizar perfil.');
    } finally {
      if (mounted) setState(() => _savingProfile = false);
    }
  }

  Future<void> _savePassword() async {
    if (_newPwd.text != _confirmPwd.text) {
      showToast(context, 'As senhas não coincidem.');
      return;
    }
    if (_newPwd.text.length < 6) {
      showToast(context, 'Senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setState(() => _savingPwd = true);
    try {
      await context.read<ApiClient>().updatePassword(_currentPwd.text, _newPwd.text);
      _currentPwd.clear();
      _newPwd.clear();
      _confirmPwd.clear();
      if (mounted) showToast(context, 'Senha alterada!', success: true);
    } on ApiError catch (e) {
      if (mounted) showToast(context, e.message);
    } finally {
      if (mounted) setState(() => _savingPwd = false);
    }
  }

  Future<void> _saveSettings() async {
    setState(() => _savingSettings = true);
    try {
      await context.read<SettingsProvider>().save({
        'parserMode': _parserMode,
        'aiProvider': _aiProvider.isEmpty ? null : _aiProvider,
        'aiApiKey': _aiApiKey.text.isEmpty ? null : _aiApiKey.text,
        'toleranceMeters': _toleranceMeters.round(),
        'instanceMode': _instanceMode,
        'googleMapsApiKey': _googleMapsKey.text.isEmpty ? null : _googleMapsKey.text,
        'valorPorRota': _valorPorRota.text.isEmpty ? null : double.tryParse(_valorPorRota.text),
        'cicloPagamentoDias': _cicloPagamentoDias,
        'metaMensalRotas': _metaMensalRotas.text.isEmpty ? null : int.tryParse(_metaMensalRotas.text),
        'despesasFixasMensais':
            _despesasFixasMensais.text.isEmpty ? null : double.tryParse(_despesasFixasMensais.text),
      });
      if (mounted) showToast(context, 'Configurações salvas!', success: true);
    } catch (_) {
      if (mounted) showToast(context, 'Erro ao salvar configurações.');
    } finally {
      if (mounted) setState(() => _savingSettings = false);
    }
  }

  Future<void> _pickAvatar() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery, maxWidth: 1024, maxHeight: 1024, imageQuality: 88);
    if (picked == null) return;
    final f = File(picked.path);
    if (await f.length() > 2 * 1024 * 1024) {
      if (mounted) showToast(context, 'Imagem muito grande. Máximo 2MB.');
      return;
    }
    setState(() => _avatarUploading = true);
    try {
      final res = await context.read<ApiClient>().uploadAvatar(f);
      context.read<AuthProvider>().setUser(AppUser.fromJson(res));
      if (mounted) showToast(context, 'Foto atualizada!', success: true);
    } catch (_) {
      if (mounted) showToast(context, 'Erro ao enviar foto.');
    } finally {
      if (mounted) setState(() => _avatarUploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    return AppLayout(
      currentPath: '/settings',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Configurações',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -0.5, color: context.text)),
          const SizedBox(height: 4),
          Text('Perfil, financeiro, instâncias, parser e tolerância.',
              style: TextStyle(fontSize: 13, color: context.textFaint)),
          const SizedBox(height: 16),
          _tabs(),
          const SizedBox(height: 16),
          if (_activeTab == 'perfil') _perfilTab(user),
          if (_activeTab == 'financeiro') _financeiroTab(),
          if (_activeTab == 'instancias') _instanciasTab(),
          if (_activeTab == 'parser') _parserTab(),
          if (_activeTab == 'tolerancia') _toleranciaTab(),
          if (_activeTab == 'servidor') _servidorTab(),
          if (_activeTab == 'sobre') _sobreTab(),
        ],
      ),
    );
  }

  Widget _tabs() {
    final tabs = [
      ('perfil', 'Perfil'),
      ('financeiro', 'Financeiro'),
      ('instancias', 'Instâncias'),
      ('parser', 'Parser'),
      ('tolerancia', 'Tolerância'),
      ('servidor', 'Servidor'),
      ('sobre', 'Sobre'),
    ];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (final t in tabs)
            Padding(
              padding: const EdgeInsets.only(right: 6),
              child: GestureDetector(
                onTap: () => setState(() => _activeTab = t.$1),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    border: Border(
                      bottom: BorderSide(
                        color: _activeTab == t.$1 ? context.accent : Colors.transparent,
                        width: 2,
                      ),
                    ),
                  ),
                  child: Text(
                    t.$2,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: _activeTab == t.$1 ? FontWeight.w700 : FontWeight.w500,
                      color: _activeTab == t.$1 ? context.accent : context.textMuted,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _perfilTab(AppUser? user) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CardSection(
          header: const CardHeaderLabel('Foto e Informações'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Stack(
                    children: [
                      Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          color: context.accentDim,
                          shape: BoxShape.circle,
                          border: Border.all(color: context.borderStrong),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: (user?.avatarUrl != null && user!.avatarUrl!.isNotEmpty)
                            ? Image.network(
                                user.avatarUrl!.startsWith('http')
                                    ? user.avatarUrl!
                                    : '${context.read<ApiClient>().baseUrl}${user.avatarUrl}',
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => Center(
                                    child: Text((user.name).isNotEmpty ? user.name[0].toUpperCase() : 'U',
                                        style: TextStyle(color: context.accent, fontWeight: FontWeight.w800, fontSize: 22))),
                              )
                            : Center(
                                child: Text((user?.name ?? 'U').isNotEmpty ? user!.name[0].toUpperCase() : 'U',
                                    style: TextStyle(color: context.accent, fontWeight: FontWeight.w800, fontSize: 22))),
                      ),
                      if (_avatarUploading)
                        Positioned.fill(
                          child: Container(
                            decoration: const BoxDecoration(color: Color(0x66000000), shape: BoxShape.circle),
                            child: const Center(child: AppSpinner(size: 18, color: Colors.white)),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Foto de Perfil',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: context.text)),
                        const SizedBox(height: 2),
                        Text('JPG, PNG, WEBP ou GIF · máx 2MB',
                            style: TextStyle(fontSize: 11, color: context.textFaint)),
                        const SizedBox(height: 8),
                        OutlinedButton.icon(
                          onPressed: _avatarUploading ? null : _pickAvatar,
                          icon: const Icon(Icons.image_outlined, size: 16),
                          label: Text(_avatarUploading ? 'Enviando...' : 'Escolher da galeria'),
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(color: context.borderStrong),
                            foregroundColor: context.textMuted,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.pill)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _label('NOME'),
              TextField(controller: _name),
              const SizedBox(height: 12),
              _label('DATA DE NASCIMENTO'),
              InkWell(
                onTap: _pickBirthDate,
                child: InputDecorator(
                  decoration: const InputDecoration(),
                  child: Text(_birthDate.isEmpty ? 'Selecione' : _birthDate,
                      style: TextStyle(color: _birthDate.isEmpty ? context.textFaint : context.text, fontSize: 14)),
                ),
              ),
              const SizedBox(height: 12),
              _label('EMAIL'),
              TextField(controller: TextEditingController(text: user?.email ?? ''), enabled: false),
              const SizedBox(height: 16),
              _saveButton('Salvar Perfil', _savingProfile, _saveProfile),
            ],
          ),
        ),
        const SizedBox(height: 14),
        CardSection(
          header: const CardHeaderLabel('Alterar Senha'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _label('SENHA ATUAL'),
              TextField(controller: _currentPwd, obscureText: true),
              const SizedBox(height: 10),
              _label('NOVA SENHA'),
              TextField(controller: _newPwd, obscureText: true),
              const SizedBox(height: 10),
              _label('CONFIRMAR NOVA SENHA'),
              TextField(controller: _confirmPwd, obscureText: true),
              const SizedBox(height: 16),
              _saveButton('Alterar Senha', _savingPwd, _savePassword, dark: true),
            ],
          ),
        ),
      ],
    );
  }

  Widget _financeiroTab() {
    final loading = context.watch<SettingsProvider>().loading;
    return CardSection(
      header: const CardHeaderLabel('Controle de Renda'),
      child: loading
          ? const Padding(padding: EdgeInsets.all(20), child: Center(child: AppSpinner()))
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Configure sua remuneração por rota e despesas. Usado no gráfico financeiro.',
                    style: TextStyle(fontSize: 12, color: context.textMuted, height: 1.5)),
                const SizedBox(height: 16),
                _label('VALOR POR ROTA (R\$)'),
                TextField(
                    controller: _valorPorRota,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(hintText: 'ex: 12.50')),
                const SizedBox(height: 12),
                _label('CICLO DE PAGAMENTO'),
                DropdownButtonFormField<int>(
                  initialValue: _cicloPagamentoDias,
                  items: const [
                    DropdownMenuItem(value: 7, child: Text('Semanal (7 dias)')),
                    DropdownMenuItem(value: 14, child: Text('Quinzenal (14 dias)')),
                    DropdownMenuItem(value: 30, child: Text('Mensal (30 dias)')),
                  ],
                  onChanged: (v) => setState(() => _cicloPagamentoDias = v ?? 30),
                ),
                const SizedBox(height: 12),
                _label('META MENSAL DE ROTAS'),
                TextField(
                    controller: _metaMensalRotas,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(hintText: 'ex: 200')),
                const SizedBox(height: 12),
                _label('DESPESAS FIXAS MENSAIS (R\$)'),
                TextField(
                    controller: _despesasFixasMensais,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(hintText: 'ex: 450.00')),
                const SizedBox(height: 16),
                _saveButton('Salvar Financeiro', _savingSettings, _saveSettings),
              ],
            ),
    );
  }

  Widget _instanciasTab() {
    final opts = const [
      ('builtin', 'Padrão Gratuito', 'Photon + Overpass + Nominatim + BrasilAPI. Zero custo.'),
      ('geocodebr', 'GeocodeR BR', 'Microserviço R via CNEFE/IBGE. Precisão máxima.'),
      ('googlemaps', 'Google Maps', 'Geocoding API. Alta precisão. Requer chave paga.'),
    ];
    return CardSection(
      header: const CardHeaderLabel('Instância de Geocodificação'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final o in opts)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: InkWell(
                onTap: () => setState(() => _instanceMode = o.$1),
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _instanceMode == o.$1 ? context.accentDim : context.surface2,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: _instanceMode == o.$1 ? context.accent : context.borderStrong, width: 1.5),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(o.$2,
                          style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: _instanceMode == o.$1 ? context.accent : context.text)),
                      const SizedBox(height: 4),
                      Text(o.$3, style: TextStyle(fontSize: 11, color: context.textFaint, height: 1.4)),
                    ],
                  ),
                ),
              ),
            ),
          if (_instanceMode == 'googlemaps') ...[
            const SizedBox(height: 8),
            _label('CHAVE DE API DO GOOGLE MAPS'),
            TextField(
                controller: _googleMapsKey,
                obscureText: true,
                decoration: const InputDecoration(hintText: 'AIzaSy...')),
          ],
          const SizedBox(height: 16),
          _saveButton('Salvar Instância', _savingSettings, _saveSettings),
        ],
      ),
    );
  }

  Widget _parserTab() {
    return CardSection(
      header: const CardHeaderLabel('Configuração do Parser'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final o in const [
            ('builtin', 'Parser Embutido', 'Algoritmo próprio, offline, zero custo.'),
            ('ai', 'Inteligência Artificial', 'Maior precisão usando IA externa.'),
          ])
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: InkWell(
                onTap: () => setState(() => _parserMode = o.$1),
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _parserMode == o.$1 ? context.accentDim : context.surface2,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: _parserMode == o.$1 ? context.accent : context.borderStrong),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(o.$2,
                          style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: _parserMode == o.$1 ? context.accent : context.text)),
                      const SizedBox(height: 3),
                      Text(o.$3, style: TextStyle(fontSize: 11, color: context.textFaint)),
                    ],
                  ),
                ),
              ),
            ),
          if (_parserMode == 'ai') ...[
            const SizedBox(height: 8),
            _label('PROVEDOR DE IA'),
            DropdownButtonFormField<String>(
              initialValue: _aiProvider.isEmpty ? null : _aiProvider,
              hint: const Text('Selecione um provedor'),
              items: const [
                DropdownMenuItem(value: 'openai', child: Text('OpenAI (GPT-4o mini)')),
                DropdownMenuItem(value: 'anthropic', child: Text('Anthropic (Claude Haiku)')),
                DropdownMenuItem(value: 'google', child: Text('Google (Gemini 1.5 Flash)')),
              ],
              onChanged: (v) => setState(() => _aiProvider = v ?? ''),
            ),
            const SizedBox(height: 10),
            _label('CHAVE DE API'),
            TextField(controller: _aiApiKey, obscureText: true, decoration: const InputDecoration(hintText: 'sk-... ou AIza...')),
          ],
          const SizedBox(height: 16),
          _saveButton('Salvar Parser', _savingSettings, _saveSettings),
        ],
      ),
    );
  }

  Widget _toleranciaTab() {
    return CardSection(
      header: const CardHeaderLabel('Tolerância de Coordenadas'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Distância máxima (metros) entre coordenada GPS e endereço oficial para validação.',
              style: TextStyle(fontSize: 12, color: context.textMuted, height: 1.5)),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _label('DISTÂNCIA'),
              Text('${_toleranceMeters.round()}m',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: context.accent)),
            ],
          ),
          Slider(
            value: _toleranceMeters,
            min: 100,
            max: 5000,
            divisions: 49,
            activeColor: context.accent,
            onChanged: (v) => setState(() => _toleranceMeters = v),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('100m · Rigoroso', style: TextStyle(fontSize: 10, color: context.textFaint)),
              Text('5000m · Flexível', style: TextStyle(fontSize: 10, color: context.textFaint)),
            ],
          ),
          const SizedBox(height: 16),
          _saveButton('Salvar Tolerância', _savingSettings, _saveSettings),
        ],
      ),
    );
  }

  Widget _servidorTab() {
    final cfg = context.watch<ServerConfig>();
    final ctrl = TextEditingController(text: cfg.baseUrl);
    Future<void> save() async {
      final url = ctrl.text.trim();
      if (url.isEmpty) {
        showToast(context, 'Informe a URL do servidor.');
        return;
      }
      await context.read<ServerConfig>().setBaseUrl(url);
      if (mounted) showToast(context, 'Servidor atualizado!', success: true);
    }

    Future<void> reset() async {
      await context.read<ServerConfig>().reset();
      if (mounted) showToast(context, 'Servidor padrão restaurado.', success: true);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CardSection(
          header: const CardHeaderLabel('Servidor da API'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Endereço do servidor ViaX:Trace usado pelo aplicativo. Mantenha o padrão para usar o serviço oficial em nuvem ou aponte para sua própria instância.',
                style: TextStyle(fontSize: 12, color: context.textMuted, height: 1.6),
              ),
              const SizedBox(height: 14),
              _label('URL DO SERVIDOR'),
              TextField(
                controller: ctrl,
                keyboardType: TextInputType.url,
                autocorrect: false,
                decoration: const InputDecoration(hintText: 'https://viax-scout.replit.app'),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: cfg.isDefault ? context.ok : context.accent,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      cfg.isDefault ? 'Usando servidor padrão (oficial)' : 'Servidor personalizado configurado',
                      style: TextStyle(fontSize: 11, color: context.textFaint),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _saveButton('Salvar Servidor', false, save),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: OutlinedButton(
                  onPressed: cfg.isDefault ? null : reset,
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: context.borderStrong),
                    foregroundColor: context.textMuted,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.pill)),
                  ),
                  child: const Text('Restaurar padrão'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _sobreTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CardSection(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Text('ViaX:System',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: context.text, letterSpacing: -0.5)),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: context.accentDim, borderRadius: BorderRadius.circular(5)),
                  child: Text('v8.0',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: context.accent)),
                ),
              ]),
              const SizedBox(height: 4),
              Text('Validação inteligente de rotas de entrega',
                  style: TextStyle(fontSize: 12, color: context.textMuted)),
              const SizedBox(height: 12),
              Text(
                'Sistema de auditoria de rotas logísticas que valida endereços contra coordenadas GPS via geocodificação reversa.',
                style: TextStyle(fontSize: 13, color: context.textMuted, height: 1.6),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        CardSection(
          header: const CardHeaderLabel('Repositório'),
          child: Column(
            children: [
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(Icons.code, color: context.accent),
                title: Text('GitHub — esmagafetos/Viax-Scout',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: context.text)),
                subtitle: Text('Código-fonte, issues, releases',
                    style: TextStyle(fontSize: 11, color: context.textFaint)),
                trailing: Icon(Icons.open_in_new, size: 16, color: context.textFaint),
                onTap: () {},
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _label(String t) => Padding(
        padding: const EdgeInsets.only(bottom: 6, top: 4),
        child: Text(t,
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.2, color: context.textFaint)),
      );

  Widget _saveButton(String label, bool loading, VoidCallback onPressed, {bool dark = false}) {
    return SizedBox(
      width: double.infinity,
      height: 46,
      child: ElevatedButton(
        style: dark
            ? ElevatedButton.styleFrom(
                backgroundColor: context.text,
                foregroundColor: context.bg,
              )
            : null,
        onPressed: loading ? null : onPressed,
        child: loading
            ? const SizedBox(
                width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
            : Text(label),
      ),
    );
  }
}
