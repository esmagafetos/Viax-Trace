import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../state/server_config.dart';
import '../theme/theme.dart';
import '../widgets/viax_logo.dart';

class ServerSetupScreen extends StatefulWidget {
  const ServerSetupScreen({super.key});

  @override
  State<ServerSetupScreen> createState() => _ServerSetupScreenState();
}

class _ServerSetupScreenState extends State<ServerSetupScreen> {
  final _ctrl = TextEditingController();
  bool _testing = false;
  String? _testResult;
  bool _ok = false;

  @override
  void initState() {
    super.initState();
    final cfg = context.read<ServerConfig>();
    _ctrl.text = cfg.baseUrl;
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _test() async {
    final api = context.read<ApiClient>();
    setState(() {
      _testing = true;
      _testResult = null;
      _ok = false;
    });
    final url = _ctrl.text.trim();
    final ok = await api.testConnection(_normalize(url));
    if (!mounted) return;
    setState(() {
      _testing = false;
      _ok = ok;
      _testResult = ok
          ? 'Conexão estabelecida com sucesso.'
          : 'Não foi possível conectar. Verifique o IP, a porta e se o backend está rodando no Termux.';
    });
  }

  Future<void> _save() async {
    final cfg = context.read<ServerConfig>();
    await cfg.setBaseUrl(_ctrl.text.trim());
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Servidor salvo. Faça login para continuar.')),
    );
    context.go('/login');
  }

  String _normalize(String s) {
    var v = s.trim();
    if (v.isEmpty) return v;
    if (!v.startsWith('http://') && !v.startsWith('https://')) v = 'http://$v';
    while (v.endsWith('/')) {
      v = v.substring(0, v.length - 1);
    }
    return v;
  }

  @override
  Widget build(BuildContext context) {
    final cfg = context.watch<ServerConfig>();
    return Scaffold(
      backgroundColor: context.bg,
      appBar: AppBar(
        backgroundColor: context.bg,
        foregroundColor: context.text,
        elevation: 0,
        title: const Text('Configurar servidor'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(children: [const ViaXLogo(fontSize: 22, showSubtitle: false)]),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: context.surface,
                  borderRadius: BorderRadius.circular(AppRadii.lg),
                  border: Border.all(color: context.borderStrong),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('URL do backend', style: TextStyle(color: context.text, fontWeight: FontWeight.w700, fontSize: 15)),
                    const SizedBox(height: 6),
                    Text(
                      'No Termux, rode  bash ~/viax-system/start-backend.sh  e cole abaixo a URL exibida.',
                      style: TextStyle(color: context.textMuted, fontSize: 12, height: 1.5),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: _ctrl,
                      keyboardType: TextInputType.url,
                      autocorrect: false,
                      style: TextStyle(color: context.text),
                      decoration: InputDecoration(
                        hintText: 'http://127.0.0.1:8080',
                        hintStyle: TextStyle(color: context.textMuted),
                        filled: true,
                        fillColor: context.bg,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: context.borderStrong),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: context.borderStrong),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _testing ? null : _test,
                          icon: _testing
                              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                              : const Icon(Icons.wifi_tethering, size: 18),
                          label: const Text('Testar conexão'),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            side: BorderSide(color: context.borderStrong),
                            foregroundColor: context.text,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.pill)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _testing ? null : _save,
                          icon: const Icon(Icons.check, size: 18),
                          label: const Text('Salvar'),
                        ),
                      ),
                    ]),
                    if (_testResult != null) ...[
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: (_ok ? const Color(0xff1a7a4a) : const Color(0xffb33a3a)).withOpacity(0.12),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                              color: (_ok ? const Color(0xff1a7a4a) : const Color(0xffb33a3a)).withOpacity(0.4)),
                        ),
                        child: Row(children: [
                          Icon(_ok ? Icons.check_circle : Icons.error_outline,
                              size: 18, color: _ok ? const Color(0xff1a7a4a) : const Color(0xffb33a3a)),
                          const SizedBox(width: 8),
                          Expanded(child: Text(_testResult!, style: TextStyle(fontSize: 12, color: context.text))),
                        ]),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: context.surface,
                  borderRadius: BorderRadius.circular(AppRadii.lg),
                  border: Border.all(color: context.border),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Como usar', style: TextStyle(color: context.text, fontWeight: FontWeight.w700, fontSize: 13)),
                  const SizedBox(height: 8),
                  _bullet(context, '1.', 'Instale o Termux e rode  install-termux.sh  uma vez.'),
                  _bullet(context, '2.', 'Em seguida, rode  bash ~/viax-system/start-backend.sh.'),
                  _bullet(context, '3.', 'Cole aqui a URL exibida (ex.: http://127.0.0.1:8080) e toque em Testar.'),
                  _bullet(context, '4.', 'Se quiser usar a nuvem, deixe   ${kApiBaseDefault}.'),
                ]),
              ),
              const SizedBox(height: 16),
              if (!cfg.isDefault)
                TextButton(
                  onPressed: () async {
                    await context.read<ServerConfig>().reset();
                    if (!mounted) return;
                    setState(() => _ctrl.text = kApiBaseDefault);
                  },
                  child: Text('Restaurar padrão', style: TextStyle(color: context.textMuted)),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _bullet(BuildContext ctx, String n, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(width: 22, child: Text(n, style: TextStyle(color: ctx.accent, fontWeight: FontWeight.w700, fontSize: 12))),
        Expanded(child: Text(text, style: TextStyle(color: ctx.textMuted, fontSize: 12, height: 1.45))),
      ]),
    );
  }
}
