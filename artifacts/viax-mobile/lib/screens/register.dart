import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../state/auth_provider.dart';
import '../state/theme_provider.dart';
import '../theme/theme.dart';
import '../widgets/toast.dart';
import '../widgets/brand_mark.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  String _birthDate = '';
  bool _loading = false;
  final Map<String, bool> _touched = {};

  @override
  void initState() {
    super.initState();
    _password.addListener(() => setState(() {}));
    _email.addListener(() => setState(() {}));
    _name.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  // Mirrors web: validateEmail / validatePassword in Register.tsx
  String? _validateEmail(String e) {
    if (e.isEmpty) return 'Email é obrigatório.';
    final re = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$');
    if (!re.hasMatch(e)) return 'Formato de email inválido.';
    return null;
  }

  String? _validatePassword(String p) {
    if (p.isEmpty) return 'Senha é obrigatória.';
    if (p.length < 8) return 'A senha deve ter pelo menos 8 caracteres.';
    if (!RegExp(r'[A-Za-z]').hasMatch(p)) return 'A senha deve conter pelo menos uma letra.';
    if (!RegExp(r'[0-9]').hasMatch(p)) return 'A senha deve conter pelo menos um número.';
    return null;
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 25),
      firstDate: DateTime(1920),
      lastDate: now,
    );
    if (picked != null) {
      setState(() => _birthDate =
          '${picked.year.toString().padLeft(4, "0")}-${picked.month.toString().padLeft(2, "0")}-${picked.day.toString().padLeft(2, "0")}');
    }
  }

  Future<void> _submit() async {
    setState(() {
      _touched['name'] = true;
      _touched['email'] = true;
      _touched['password'] = true;
    });

    final emailErr = _validateEmail(_email.text.trim());
    final pwdErr = _validatePassword(_password.text);
    if (_name.text.trim().isEmpty || emailErr != null || pwdErr != null) {
      showToast(context, emailErr ?? pwdErr ?? 'Preencha todos os campos obrigatórios.');
      return;
    }

    setState(() => _loading = true);
    try {
      await context.read<AuthProvider>().register(
            _name.text.trim(),
            _email.text.trim(),
            _password.text,
            birthDate: _birthDate.isEmpty ? null : _birthDate,
          );
      if (mounted) context.go('/setup');
    } on ApiError catch (e) {
      if (mounted) showToast(context, e.message);
    } catch (_) {
      if (mounted) showToast(context, 'Erro ao criar conta.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeProv = context.watch<ThemeProvider>();
    final dark = themeProv.dark;

    final nameError = (_touched['name'] ?? false) && _name.text.trim().isEmpty
        ? 'Nome é obrigatório.'
        : null;
    final emailError =
        (_touched['email'] ?? false) ? _validateEmail(_email.text.trim()) : null;
    final passwordError =
        (_touched['password'] ?? false) ? _validatePassword(_password.text) : null;

    return Scaffold(
      backgroundColor: context.bg,
      body: SafeArea(
        child: Stack(
          children: [
            Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 440),
                  child: Container(
                    decoration: BoxDecoration(
                      color: context.surface,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: context.borderStrong),
                      boxShadow: [
                        BoxShadow(
                            color: Colors.black.withValues(alpha: 0.09),
                            blurRadius: 40,
                            offset: const Offset(0, 12)),
                      ],
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Container(
                          padding: const EdgeInsets.fromLTRB(28, 28, 28, 20),
                          decoration: BoxDecoration(
                            border: Border(bottom: BorderSide(color: context.border)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Padding(
                                padding: EdgeInsets.only(bottom: 12),
                                child: BrandLockup(
                                  markSize: 28,
                                  wordmarkSize: 22,
                                  showSubtitle: true,
                                  horizontal: true,
                                ),
                              ),
                              Text('Crie sua conta gratuita',
                                  style: TextStyle(fontSize: 13, color: context.textFaint)),
                            ],
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.fromLTRB(28, 24, 28, 28),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              _label(context, 'Nome completo'),
                              const SizedBox(height: 6),
                              _input(
                                controller: _name,
                                hint: 'Seu nome',
                                error: nameError,
                                onBlur: () => setState(() => _touched['name'] = true),
                              ),
                              if (nameError != null) _err(context, nameError),
                              const SizedBox(height: 16),
                              _label(context, 'Email'),
                              const SizedBox(height: 6),
                              _input(
                                controller: _email,
                                hint: 'seu@email.com',
                                error: emailError,
                                keyboardType: TextInputType.emailAddress,
                                onBlur: () => setState(() => _touched['email'] = true),
                              ),
                              if (emailError != null) _err(context, emailError),
                              const SizedBox(height: 16),
                              _label(context, 'Senha'),
                              const SizedBox(height: 6),
                              _input(
                                controller: _password,
                                hint: 'Mínimo 8 caracteres',
                                error: passwordError,
                                obscure: true,
                                onBlur: () => setState(() => _touched['password'] = true),
                              ),
                              if (_password.text.isNotEmpty)
                                _PasswordStrength(password: _password.text),
                              if (passwordError != null) _err(context, passwordError),
                              const SizedBox(height: 16),
                              Row(
                                children: [
                                  _label(context, 'Data de nascimento'),
                                  const SizedBox(width: 6),
                                  Text('(opcional)',
                                      style: TextStyle(
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.w400,
                                          color: context.textFaint.withValues(alpha: 0.7))),
                                ],
                              ),
                              const SizedBox(height: 6),
                              InkWell(
                                onTap: _pickDate,
                                child: InputDecorator(
                                  decoration: const InputDecoration(),
                                  child: Text(
                                    _birthDate.isEmpty ? 'mm/dd/aaaa' : _birthDate,
                                    style: TextStyle(
                                      color:
                                          _birthDate.isEmpty ? context.textFaint : context.text,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 22),
                              SizedBox(
                                height: 42,
                                width: double.infinity,
                                child: ElevatedButton(
                                  onPressed: _loading ? null : _submit,
                                  child: Text(
                                    _loading ? 'Criando conta...' : 'Criar conta',
                                  ),
                                ),
                              ),
                              const SizedBox(height: 18),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text('Já tem conta? ',
                                      style: TextStyle(fontSize: 12.5, color: context.textFaint)),
                                  GestureDetector(
                                    onTap: () => context.go('/login'),
                                    child: Text('Entrar',
                                        style: TextStyle(
                                            fontSize: 12.5,
                                            color: context.accent,
                                            fontWeight: FontWeight.w700)),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              top: 12,
              right: 16,
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(99),
                  onTap: themeProv.toggle,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                    decoration: BoxDecoration(
                      color: context.surface,
                      borderRadius: BorderRadius.circular(99),
                      border: Border.all(color: context.borderStrong),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          dark ? Icons.wb_sunny_outlined : Icons.nightlight_outlined,
                          size: 13,
                          color: context.textMuted,
                        ),
                        const SizedBox(width: 6),
                        Text(dark ? 'Claro' : 'Escuro',
                            style: TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w500,
                                color: context.textMuted)),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _label(BuildContext c, String t) => Text(
        t.toUpperCase(),
        style: TextStyle(
          fontSize: 10.5,
          fontWeight: FontWeight.w600,
          letterSpacing: 1.2,
          color: c.textFaint,
        ),
      );

  Widget _input({
    required TextEditingController controller,
    required String hint,
    String? error,
    bool obscure = false,
    TextInputType? keyboardType,
    VoidCallback? onBlur,
  }) {
    return Focus(
      onFocusChange: (has) {
        if (!has && onBlur != null) onBlur();
      },
      child: TextField(
        controller: controller,
        obscureText: obscure,
        keyboardType: keyboardType,
        decoration: InputDecoration(
          hintText: hint,
          enabledBorder: error != null
              ? OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: context.accent),
                )
              : null,
        ),
      ),
    );
  }

  Widget _err(BuildContext c, String message) => Padding(
        padding: const EdgeInsets.only(top: 5),
        child: Text(message,
            style: TextStyle(fontSize: 11, color: c.accent, fontWeight: FontWeight.w500)),
      );
}

/// Mirrors web `<PasswordStrength>` from Register.tsx — 4-segment bar plus
/// inline checks (8+ caracteres / Letra / Número / Símbolo).
class _PasswordStrength extends StatelessWidget {
  final String password;
  const _PasswordStrength({required this.password});

  @override
  Widget build(BuildContext context) {
    final checks = [
      _Check('8+ caracteres', password.length >= 8),
      _Check('Letra', RegExp(r'[A-Za-z]').hasMatch(password)),
      _Check('Número', RegExp(r'[0-9]').hasMatch(password)),
      _Check('Símbolo', RegExp(r'[^A-Za-z0-9]').hasMatch(password)),
    ];
    final score = checks.where((c) => c.ok).length;
    const levels = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'];
    final segColors = [
      context.accent,
      context.accent,
      const Color(0xFFF59E0B),
      const Color(0xFF22C55E),
      const Color(0xFF16A34A),
    ];

    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: List.generate(4, (i) {
              return Expanded(
                child: Container(
                  height: 3,
                  margin: EdgeInsets.only(right: i < 3 ? 4 : 0),
                  decoration: BoxDecoration(
                    color: i < score ? segColors[score] : context.borderStrong,
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(levels[score],
                  style: TextStyle(
                      fontSize: 10.5,
                      color: score >= 3 ? const Color(0xFF22C55E) : context.textFaint)),
              for (final c in checks)
                Text(
                  '${c.ok ? '✓' : '·'} ${c.label}',
                  style: TextStyle(
                    fontSize: 10,
                    color: c.ok ? const Color(0xFF22C55E) : context.textFaint,
                    fontWeight: c.ok ? FontWeight.w600 : FontWeight.w400,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Check {
  final String label;
  final bool ok;
  _Check(this.label, this.ok);
}
