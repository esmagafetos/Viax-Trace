import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../state/auth_provider.dart';
import '../theme/theme.dart';
import '../widgets/toast.dart';
import '../widgets/viax_logo.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();
  String _birthDate = '';
  bool _loading = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _confirmPassword.dispose();
    super.dispose();
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
    if (_name.text.trim().isEmpty || _email.text.trim().isEmpty || _password.text.isEmpty) {
      showToast(context, 'Preencha todos os campos obrigatórios.');
      return;
    }
    if (_password.text.length < 6) {
      showToast(context, 'Senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (_password.text != _confirmPassword.text) {
      showToast(context, 'As senhas não coincidem.');
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
      if (mounted) context.go('/dashboard');
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
    return Scaffold(
      backgroundColor: context.bg,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                children: [
                  const SizedBox(height: 8),
                  const ViaXLogo(fontSize: 26, showSubtitle: true),
                  const SizedBox(height: 22),
                  Container(
                    padding: const EdgeInsets.all(22),
                    decoration: BoxDecoration(
                      color: context.surface,
                      borderRadius: BorderRadius.circular(AppRadii.lg),
                      border: Border.all(color: context.borderStrong),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text('Criar conta',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: context.text)),
                        const SizedBox(height: 4),
                        Text('Comece a auditar suas rotas em segundos',
                            style: TextStyle(fontSize: 12, color: context.textFaint)),
                        const SizedBox(height: 18),
                        _label(context, 'NOME'),
                        TextField(controller: _name, decoration: const InputDecoration(hintText: 'Seu nome')),
                        const SizedBox(height: 12),
                        _label(context, 'EMAIL'),
                        TextField(
                            controller: _email,
                            keyboardType: TextInputType.emailAddress,
                            decoration: const InputDecoration(hintText: 'voce@exemplo.com')),
                        const SizedBox(height: 12),
                        _label(context, 'DATA DE NASCIMENTO (OPCIONAL)'),
                        InkWell(
                          onTap: _pickDate,
                          child: InputDecorator(
                            decoration: const InputDecoration(),
                            child: Text(
                              _birthDate.isEmpty ? 'Selecione uma data' : _birthDate,
                              style: TextStyle(
                                color: _birthDate.isEmpty ? context.textFaint : context.text,
                                fontSize: 14,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        _label(context, 'SENHA'),
                        TextField(
                            controller: _password,
                            obscureText: true,
                            decoration: const InputDecoration(hintText: 'Mínimo 6 caracteres')),
                        const SizedBox(height: 12),
                        _label(context, 'CONFIRMAR SENHA'),
                        TextField(
                            controller: _confirmPassword,
                            obscureText: true,
                            onSubmitted: (_) => _submit(),
                            decoration: const InputDecoration(hintText: '••••••••')),
                        const SizedBox(height: 20),
                        SizedBox(
                          height: 48,
                          child: ElevatedButton(
                            onPressed: _loading ? null : _submit,
                            child: _loading
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
                                : const Text('Criar conta'),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text('Já tem conta? ', style: TextStyle(fontSize: 12, color: context.textFaint)),
                            GestureDetector(
                              onTap: () => context.go('/login'),
                              child: Text('Entrar',
                                  style: TextStyle(fontSize: 12, color: context.accent, fontWeight: FontWeight.w700)),
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
    );
  }

  Widget _label(BuildContext c, String t) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(t,
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.2, color: c.textFaint)),
      );
}
