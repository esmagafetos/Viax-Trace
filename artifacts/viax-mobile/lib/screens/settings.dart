import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/api_client.dart';
import '../services/haptics.dart';
import '../state/auth_provider.dart';
import '../state/settings_provider.dart';
import '../theme/theme.dart';
import '../widgets/layout.dart';
import '../widgets/spinner.dart';
import '../widgets/toast.dart';
import '../widgets/user_avatar.dart';

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
  final _geocodebrUrl = TextEditingController();
  final _valorPorRota = TextEditingController();
  int _cicloPagamentoDias = 30;
  final _metaMensalRotas = TextEditingController();
  final _despesasFixasMensais = TextEditingController();

  bool _avatarUploading = false;
  bool _savingProfile = false;
  bool _savingPwd = false;
  bool _savingSettings = false;

  // Haptics toggle (mirrors AppHaptics.enabled, persisted device-locally)
  bool _hapticsEnabled = AppHaptics.enabled;

  // AI parser key live validation (debounced 1.5s)
  Timer? _aiKeyDebounce;
  bool _aiKeyTesting = false;
  Map<String, dynamic>? _aiKeyStatus;

  // Geocoding providers live status (auto-refreshes while Instâncias is open)
  Map<String, dynamic>? _providerStatuses;
  bool _providersLoading = false;
  Timer? _providersTimer;

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
    // Debounced AI key validation while user types.
    _aiApiKey.addListener(_scheduleAiKeyTest);
  }

  @override
  void dispose() {
    _aiKeyDebounce?.cancel();
    _providersTimer?.cancel();
    _aiApiKey.removeListener(_scheduleAiKeyTest);
    super.dispose();
  }

  // ── AI key live validation ────────────────────────────────────────
  void _scheduleAiKeyTest() {
    _aiKeyDebounce?.cancel();
    final key = _aiApiKey.text.trim();
    final provider = _aiProvider.trim();
    if (key.isEmpty || provider.isEmpty) {
      if (_aiKeyStatus != null && mounted) {
        setState(() => _aiKeyStatus = null);
      }
      return;
    }
    _aiKeyDebounce = Timer(const Duration(milliseconds: 1500), _runAiKeyTest);
  }

  Future<void> _runAiKeyTest() async {
    final key = _aiApiKey.text.trim();
    final provider = _aiProvider.trim();
    if (key.isEmpty || provider.isEmpty) return;
    if (!mounted) return;
    setState(() => _aiKeyTesting = true);
    try {
      final res = await context.read<ApiClient>().testAiKey(provider, key);
      if (!mounted) return;
      // Make sure the field hasn't changed since we started — discard stale.
      if (_aiApiKey.text.trim() != key || _aiProvider.trim() != provider) return;
      setState(() {
        _aiKeyStatus = res;
        _aiKeyTesting = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _aiKeyStatus = {'ok': false, 'message': 'Sem conexão.'};
        _aiKeyTesting = false;
      });
    }
  }

  // ── Provider status periodic refresh (every 30s on Instâncias tab) ─
  Future<void> _loadProvidersNow() async {
    if (_providersLoading) return;
    if (mounted) setState(() => _providersLoading = true);
    try {
      final res = await context.read<ApiClient>().getProvidersStatus();
      if (!mounted) return;
      setState(() {
        _providerStatuses = res;
        _providersLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _providersLoading = false);
    }
  }

  void _startProvidersTimer() {
    _providersTimer?.cancel();
    _loadProvidersNow();
    _providersTimer = Timer.periodic(const Duration(seconds: 30), (_) => _loadProvidersNow());
  }

  void _stopProvidersTimer() {
    _providersTimer?.cancel();
    _providersTimer = null;
  }

  void _switchTab(String tab) {
    if (_activeTab == tab) return;
    AppHaptics.selection();
    setState(() => _activeTab = tab);
    if (tab == 'instancias') {
      _startProvidersTimer();
    } else {
      _stopProvidersTimer();
    }
  }

  void _hydrate() {
    final s = context.read<SettingsProvider>().data ?? {};
    _parserMode = (s['parserMode'] as String?) ?? 'builtin';
    _aiProvider = (s['aiProvider'] as String?) ?? '';
    _aiApiKey.text = (s['aiApiKey'] as String?) ?? '';
    _toleranceMeters = ((s['toleranceMeters'] as num?) ?? 300).toDouble();
    _instanceMode = (s['instanceMode'] as String?) ?? 'builtin';
    _googleMapsKey.text = (s['googleMapsApiKey'] as String?) ?? '';
    _geocodebrUrl.text = (s['geocodebrUrl'] as String?) ?? '';
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
    } on ApiError catch (e) {
      if (mounted) showToast(context, 'Erro ao atualizar perfil: ${e.message}');
    } catch (e) {
      if (mounted) showToast(context, 'Erro ao atualizar perfil: $e');
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
    } catch (_) {
      if (mounted) showToast(context, 'Erro ao alterar senha.');
    } finally {
      if (mounted) setState(() => _savingPwd = false);
    }
  }

  Future<void> _saveSettings() async {
    AppHaptics.tap();
    setState(() => _savingSettings = true);
    try {
      await context.read<SettingsProvider>().save({
        'parserMode': _parserMode,
        'aiProvider': _aiProvider.isEmpty ? null : _aiProvider,
        'aiApiKey': _aiApiKey.text.isEmpty ? null : _aiApiKey.text,
        'toleranceMeters': _toleranceMeters.round(),
        'instanceMode': _instanceMode,
        'googleMapsApiKey': _googleMapsKey.text.isEmpty ? null : _googleMapsKey.text,
        'geocodebrUrl': _geocodebrUrl.text.trim().isEmpty ? null : _geocodebrUrl.text.trim(),
        'valorPorRota': _valorPorRota.text.isEmpty ? null : double.tryParse(_valorPorRota.text),
        'cicloPagamentoDias': _cicloPagamentoDias,
        'metaMensalRotas': _metaMensalRotas.text.isEmpty ? null : int.tryParse(_metaMensalRotas.text),
        'despesasFixasMensais':
            _despesasFixasMensais.text.isEmpty ? null : double.tryParse(_despesasFixasMensais.text),
      });
      if (mounted) {
        AppHaptics.success();
        showToast(context, 'Configurações salvas!', success: true);
      }
    } catch (_) {
      if (mounted) {
        AppHaptics.error();
        showToast(context, 'Erro ao salvar configurações.');
      }
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
    } on ApiError catch (e) {
      if (mounted) showToast(context, 'Erro ao enviar foto: ${e.message}');
    } catch (e) {
      if (mounted) showToast(context, 'Erro ao enviar foto: $e');
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
          // Soft fade between sub-tabs to match the global page-transition
          // language (no slide, just opacity, easeOutCubic 220ms).
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 220),
            switchInCurve: Curves.easeOutCubic,
            switchOutCurve: Curves.easeInCubic,
            transitionBuilder: (child, anim) => FadeTransition(opacity: anim, child: child),
            child: KeyedSubtree(
              key: ValueKey(_activeTab),
              child: _activeTab == 'perfil'
                  ? _perfilTab(user)
                  : _activeTab == 'financeiro'
                      ? _financeiroTab()
                      : _activeTab == 'instancias'
                          ? _instanciasTab()
                          : _activeTab == 'parser'
                              ? _parserTab()
                              : _activeTab == 'tolerancia'
                                  ? _toleranciaTab()
                                  : _sobreTab(),
            ),
          ),
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
                onTap: () => _switchTab(t.$1),
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
                      UserAvatar(
                        name: user?.name ?? '',
                        avatarUrl: user?.avatarUrl,
                        size: 64,
                        fontSize: 22,
                        border: Border.all(color: context.borderStrong),
                      ),
                      if (_avatarUploading)
                        Positioned.fill(
                          child: Container(
                            decoration: const BoxDecoration(
                              color: Color(0x66000000),
                              shape: BoxShape.circle,
                            ),
                            child: const Center(
                              child: AppSpinner(size: 18, color: Colors.white),
                            ),
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
                          icon: const Icon(Icons.image_outlined, size: 14),
                          label: Text(_avatarUploading ? 'Enviando...' : 'Escolher da galeria'),
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
          header: const CardHeaderLabel('Preferências do Dispositivo'),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Vibração tátil',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: context.text)),
                    const SizedBox(height: 4),
                    Text(
                      'Resposta sutil ao tocar em botões e abas. Salva apenas neste dispositivo.',
                      style: TextStyle(fontSize: 11, color: context.textFaint, height: 1.4),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Switch.adaptive(
                value: _hapticsEnabled,
                activeThumbColor: context.accent,
                onChanged: (v) async {
                  await AppHaptics.setEnabled(v);
                  if (v) AppHaptics.tap();
                  if (mounted) setState(() => _hapticsEnabled = v);
                },
              ),
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
          if (_instanceMode == 'geocodebr') ...[
            const SizedBox(height: 8),
            _label('URL DO SEU MICROSERVIÇO GEOCODEBR'),
            TextField(
                controller: _geocodebrUrl,
                keyboardType: TextInputType.url,
                autocorrect: false,
                decoration: const InputDecoration(hintText: 'https://meu-geocodebr.exemplo.com')),
            const SizedBox(height: 8),
            Text(
              'Você precisa rodar o microserviço por conta própria (Docker, Cloudflare Tunnel, etc.). Veja artifacts/geocodebr-service/README.md.',
              style: TextStyle(fontSize: 11, color: context.textFaint, height: 1.5),
            ),
          ],
          const SizedBox(height: 16),
          _saveButton('Salvar Instância', _savingSettings, _saveSettings),
          const SizedBox(height: 14),
          _providerStatusCard(),
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
            const SizedBox(height: 8),
            _aiKeyStatusBadge(),
          ],
          const SizedBox(height: 16),
          _saveButton('Salvar Parser', _savingSettings, _saveSettings),
        ],
      ),
    );
  }

  /// Live status indicator under the AI key field. Shows verifying state
  /// while debounce/test is running and a green/red badge with the provider's
  /// response message after.
  Widget _aiKeyStatusBadge() {
    if (_aiKeyTesting) {
      return Row(
        children: [
          const AppSpinner(size: 12),
          const SizedBox(width: 8),
          Text('Verificando chave...',
              style: TextStyle(fontSize: 11.5, color: context.textFaint, fontWeight: FontWeight.w500)),
        ],
      );
    }
    final status = _aiKeyStatus;
    if (status == null) {
      if (_aiApiKey.text.trim().isEmpty || _aiProvider.isEmpty) return const SizedBox.shrink();
      return Text('Aguardando validação...',
          style: TextStyle(fontSize: 11.5, color: context.textFaint));
    }
    final ok = status['ok'] == true;
    final color = ok ? const Color(0xFF10B981) : const Color(0xFFEF4444);
    final msg = (status['message'] as String?) ?? '';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        border: Border.all(color: color.withValues(alpha: 0.45)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(ok ? Icons.check_circle : Icons.error_outline, size: 14, color: color),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              ok ? 'Online · $msg' : msg,
              style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: color),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  /// Compact provider-status card injected at the bottom of the Instâncias
  /// tab. Auto-refreshes every 30s while this tab is visible.
  Widget _providerStatusCard() {
    final providers = _providerStatuses?['providers'] as Map<String, dynamic>?;
    return CardSection(
      header: Row(
        children: [
          const Expanded(child: CardHeaderLabel('Status dos Provedores')),
          if (_providersLoading)
            const AppSpinner(size: 12)
          else
            InkWell(
              onTap: () {
                AppHaptics.tap();
                _loadProvidersNow();
              },
              borderRadius: BorderRadius.circular(6),
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Icon(Icons.refresh, size: 16, color: context.textMuted),
              ),
            ),
        ],
      ),
      child: providers == null
          ? Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Text(
                _providersLoading ? 'Verificando...' : 'Nenhuma medição ainda.',
                style: TextStyle(fontSize: 12, color: context.textFaint),
              ),
            )
          : Column(
              children: [
                for (final entry in const [
                  'photon',
                  'nominatim',
                  'brasilApi',
                  'overpass',
                  'geocodebr',
                  'googlemaps',
                ])
                  if (providers[entry] != null)
                    _providerRow(providers[entry] as Map<String, dynamic>),
              ],
            ),
    );
  }

  Widget _providerRow(Map<String, dynamic> p) {
    final configured = p['configured'] != false;
    final ok = configured && (p['ok'] == true);
    final latency = p['latencyMs'] as int?;
    final name = (p['name'] as String?) ?? '?';
    final color = !configured
        ? context.textFaint
        : ok
            ? const Color(0xFF10B981)
            : const Color(0xFFEF4444);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              name,
              style: TextStyle(
                fontSize: 12.5,
                color: !configured ? context.textFaint : context.text,
                fontWeight: FontWeight.w500,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (!configured)
            Text('Não configurado',
                style: TextStyle(fontSize: 11, color: context.textFaint))
          else if (latency != null)
            Text('${latency}ms',
                style: TextStyle(
                  fontSize: 11,
                  color: context.textMuted,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ))
          else
            Text(ok ? 'OK' : 'Off', style: TextStyle(fontSize: 11, color: color)),
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

  Future<void> _openUrl(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Widget _sobreTab() {
    final repoLinks = const [
      (
        'https://github.com/esmagafetos/Viax-Scout',
        Icons.code,
        'GitHub — esmagafetos/Viax-Scout',
        'Código-fonte, issues, pull requests e releases',
        'Open Source',
        Color(0xFF16A34A),
        Color(0x1A16A34A),
      ),
      (
        'https://github.com/esmagafetos/Viax-Scout/blob/main/README.md',
        Icons.menu_book_outlined,
        'Documentação (README)',
        'Guia de instalação, configuração e uso',
        'Docs',
        Color(0xFF1D4ED8),
        Color(0x1A1D4ED8),
      ),
      (
        'https://github.com/esmagafetos/Viax-Scout/issues',
        Icons.error_outline,
        'Issues & Suporte',
        'Reporte bugs, solicite funcionalidades ou tire dúvidas',
        'Issues',
        Color(0xFFB45309),
        Color(0x1AB45309),
      ),
      (
        'https://github.com/esmagafetos/Viax-Scout/releases',
        Icons.local_offer_outlined,
        'Releases & Changelog',
        'Histórico de versões, notas de atualização',
        'v8.0',
        null,
        null,
      ),
    ];

    final stack = const [
      ('Frontend', 'React 18 + Vite', 'TypeScript, Tailwind CSS, Wouter'),
      ('Backend', 'Express 5', 'TypeScript, REST API, pino logger'),
      ('Banco de Dados', 'PostgreSQL', 'Drizzle ORM, migrações automáticas'),
      ('Monorepo', 'pnpm workspaces', 'Libs compartilhadas, builds isolados'),
      ('Geocod. Brasil (CEP)', 'BrasilAPI v2', 'Primário BR — IBGE/Correios, lat/lon'),
      ('Geocod. Brasil (CEP)', 'AwesomeAPI CEP', 'Fallback BR — lat/lon gratuito'),
      ('Geocod. Global', 'Photon (Komoot)', 'Sem rate limit, dados OSM'),
      ('Geocod. Global', 'Overpass + Nominatim', 'Fallback — geometria OSM precisa'),
      ('Premium opcional', 'Google Maps API', 'Máxima precisão, pay-per-use'),
    ];

    final installs = const [
      (
        'Linux / macOS',
        Icons.desktop_mac_outlined,
        'curl -fsSL https://raw.githubusercontent.com/esmagafetos/Viax-Scout/main/install.sh | bash',
      ),
      (
        'Windows (PowerShell)',
        Icons.computer_outlined,
        'iwr -useb https://raw.githubusercontent.com/esmagafetos/Viax-Scout/main/install.ps1 | iex',
      ),
      (
        'Docker',
        Icons.dns_outlined,
        'docker compose up -d',
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Hero
        Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [context.surface, context.surface2],
            ),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: context.borderStrong),
          ),
          padding: const EdgeInsets.fromLTRB(20, 22, 20, 22),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  RichText(
                    text: TextSpan(
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: context.text,
                        letterSpacing: -0.6,
                      ),
                      children: [
                        const TextSpan(text: 'ViaX'),
                        TextSpan(
                          text: ':',
                          style: TextStyle(
                            color: context.text.withOpacity(0.4),
                            fontWeight: FontWeight.w300,
                          ),
                        ),
                        const TextSpan(text: 'Trace'),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: context.accentDim,
                      borderRadius: BorderRadius.circular(5),
                    ),
                    child: Text('v8.0',
                        style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                            color: context.accent,
                            letterSpacing: 0.6)),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text('Auditoria inteligente de rotas de entrega',
                  style: TextStyle(fontSize: 12.5, color: context.textMuted)),
              const SizedBox(height: 14),
              Text(
                'O ViaX:Trace nasceu para ajudar motoristas a entenderem com clareza as nuances do trajeto — termo que usamos para endereços cujas coordenadas da rota não batem com o local correto. O sistema valida cada coordenada GPS e confere se o nome da rua informado condiz com o nome da rua no mapa. Com o tempo, fomos aprimorando o motor e somando novas funções, dando origem à plataforma de auditoria que você usa hoje.',
                style: TextStyle(fontSize: 13, color: context.textMuted, height: 1.7),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Repositório & Documentação
        CardSection(
          header: const CardHeaderLabel('Repositório & Documentação'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (int i = 0; i < repoLinks.length; i++) ...[
                InkWell(
                  borderRadius: BorderRadius.circular(10),
                  onTap: () => _openUrl(repoLinks[i].$1),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    decoration: BoxDecoration(
                      color: context.surface2,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: context.border),
                    ),
                    child: Row(
                      children: [
                        Icon(repoLinks[i].$2, size: 18, color: context.textMuted),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(repoLinks[i].$3,
                                  style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: context.text)),
                              const SizedBox(height: 2),
                              Text(repoLinks[i].$4,
                                  style: TextStyle(
                                      fontSize: 11, color: context.textFaint, height: 1.4)),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: repoLinks[i].$7 ?? context.accentDim,
                            borderRadius: BorderRadius.circular(99),
                          ),
                          child: Text(repoLinks[i].$5,
                              style: TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w700,
                                  color: repoLinks[i].$6 ?? context.accent,
                                  letterSpacing: 0.5)),
                        ),
                        const SizedBox(width: 6),
                        Icon(Icons.open_in_new, size: 14, color: context.textFaint),
                      ],
                    ),
                  ),
                ),
                if (i < repoLinks.length - 1) const SizedBox(height: 8),
              ],
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Stack Tecnológico
        CardSection(
          header: const CardHeaderLabel('Stack Tecnológico'),
          child: LayoutBuilder(builder: (ctx, c) {
            final cols = c.maxWidth > 540 ? 3 : c.maxWidth > 360 ? 2 : 1;
            return GridView.count(
              crossAxisCount: cols,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
              childAspectRatio: 2.4,
              children: [
                for (final s in stack)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
                    decoration: BoxDecoration(
                      color: context.surface2,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: context.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(s.$1.toUpperCase(),
                            style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.7,
                                color: context.textFaint)),
                        const SizedBox(height: 3),
                        Text(s.$2,
                            style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: context.text)),
                        const SizedBox(height: 1),
                        Text(s.$3,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontSize: 10.5, color: context.textMuted)),
                      ],
                    ),
                  ),
              ],
            );
          }),
        ),
        const SizedBox(height: 14),

        // Instalação
        CardSection(
          header: const CardHeaderLabel('Instalação'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Scripts de instalação automática estão disponíveis no repositório para Linux, macOS e Windows. Cada script instala dependências, configura o banco e inicia o sistema completo. Para uso normal do app, nada disso é necessário — o backend oficial já está hospedado.',
                style: TextStyle(fontSize: 12.5, color: context.textMuted, height: 1.6),
              ),
              const SizedBox(height: 12),
              for (int i = 0; i < installs.length; i++) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: context.surface2,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: context.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(installs[i].$2, size: 15, color: context.textMuted),
                          const SizedBox(width: 7),
                          Text(installs[i].$1,
                              style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w600,
                                  color: context.text)),
                        ],
                      ),
                      const SizedBox(height: 7),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: context.bg,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: context.border),
                        ),
                        child: SelectableText(
                          installs[i].$3,
                          style: TextStyle(
                            fontSize: 10.5,
                            fontFamily: 'monospace',
                            color: context.textMuted,
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                if (i < installs.length - 1) const SizedBox(height: 8),
              ],
              const SizedBox(height: 10),
              RichText(
                text: TextSpan(
                  style: TextStyle(fontSize: 11, color: context.textFaint, height: 1.5),
                  children: [
                    const TextSpan(text: 'Pré-requisitos: '),
                    TextSpan(
                        text: 'Node.js 18+',
                        style: TextStyle(fontWeight: FontWeight.w700, color: context.textMuted)),
                    const TextSpan(text: ', '),
                    TextSpan(
                        text: 'pnpm',
                        style: TextStyle(fontWeight: FontWeight.w700, color: context.textMuted)),
                    const TextSpan(text: ' e '),
                    TextSpan(
                        text: 'PostgreSQL 14+',
                        style: TextStyle(fontWeight: FontWeight.w700, color: context.textMuted)),
                    const TextSpan(
                        text:
                            '. O script instala automaticamente o que estiver faltando (requer conexão com internet).'),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Licença & Versão
        CardSection(
          header: const CardHeaderLabel('Licença & Versão'),
          child: Wrap(
            spacing: 22,
            runSpacing: 14,
            children: [
              _aboutInfo('Licença', 'MIT License', 'Uso livre, comercial e pessoal'),
              _aboutInfo('Versão Atual', 'v8.0 — estável', 'BrasilAPI v2 + Photon global',
                  valueColor: context.accent),
              _aboutInfo('Ambiente', 'Node.js 18+', 'pnpm · PostgreSQL 14+'),
              _aboutInfoLink(
                'Repositório',
                'github.com/esmagafetos/Viax-Scout',
                'Fork & contribua!',
                'https://github.com/esmagafetos/Viax-Scout',
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _aboutInfo(String label, String value, String sub, {Color? valueColor}) {
    return SizedBox(
      width: 160,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label.toUpperCase(),
              style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.7,
                  color: context.textFaint)),
          const SizedBox(height: 4),
          Text(value,
              style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                  color: valueColor ?? context.text)),
          const SizedBox(height: 2),
          Text(sub, style: TextStyle(fontSize: 10.5, color: context.textMuted)),
        ],
      ),
    );
  }

  Widget _aboutInfoLink(String label, String value, String sub, String url) {
    return SizedBox(
      width: 200,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label.toUpperCase(),
              style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.7,
                  color: context.textFaint)),
          const SizedBox(height: 4),
          GestureDetector(
            onTap: () => _openUrl(url),
            child: Text(value,
                style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: context.accent)),
          ),
          const SizedBox(height: 2),
          Text(sub, style: TextStyle(fontSize: 10.5, color: context.textMuted)),
        ],
      ),
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
      height: 42,
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
                width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white))
            : Text(label),
      ),
    );
  }
}
