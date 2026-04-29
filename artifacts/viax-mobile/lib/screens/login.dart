import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../state/auth_provider.dart';
import '../state/theme_provider.dart';
import '../theme/theme.dart';
import '../widgets/toast.dart';
import '../widgets/brand_mark.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  bool _showPass = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_email.text.trim().isEmpty || _password.text.isEmpty) {
      showToast(context, 'Credenciais inválidas.');
      return;
    }
    setState(() => _loading = true);
    try {
      await context.read<AuthProvider>().login(_email.text.trim(), _password.text);
      if (mounted) context.go('/dashboard');
    } on ApiError catch (e) {
      if (mounted) showToast(context, e.message);
    } catch (_) {
      if (mounted) showToast(context, 'Credenciais inválidas.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeProv = context.watch<ThemeProvider>();
    final dark = themeProv.dark;

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
                  child: Column(
                    children: [
                      const SizedBox(height: 12),
                      const BrandLockup(markSize: 28, wordmarkSize: 22, showSubtitle: true, horizontal: true),
                      const SizedBox(height: 20),
                      Container(
                        decoration: BoxDecoration(
                          color: context.surface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: context.borderStrong),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withValues(alpha: 0.09), blurRadius: 40, offset: const Offset(0, 12)),
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
                                  Text('Acessar conta',
                                      style: TextStyle(fontSize: 17.5, fontWeight: FontWeight.w800, letterSpacing: -0.3, color: context.text)),
                                  const SizedBox(height: 3),
                                  Text('Entre com suas credenciais para continuar',
                                      style: TextStyle(fontSize: 13, color: context.textFaint)),
                                ],
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.fromLTRB(28, 24, 28, 28),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  _label(context, 'Email'),
                                  const SizedBox(height: 6),
                                  TextField(
                                    controller: _email,
                                    keyboardType: TextInputType.emailAddress,
                                    textInputAction: TextInputAction.next,
                                    autofillHints: const [AutofillHints.email],
                                    decoration: const InputDecoration(hintText: 'seu@email.com'),
                                  ),
                                  const SizedBox(height: 16),
                                  _label(context, 'Senha'),
                                  const SizedBox(height: 6),
                                  TextField(
                                    controller: _password,
                                    obscureText: !_showPass,
                                    textInputAction: TextInputAction.done,
                                    autofillHints: const [AutofillHints.password],
                                    onSubmitted: (_) => _submit(),
                                    decoration: InputDecoration(
                                      hintText: '••••••••',
                                      suffixIcon: IconButton(
                                        icon: Icon(
                                          _showPass ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                          size: 18,
                                          color: context.textFaint,
                                        ),
                                        onPressed: () => setState(() => _showPass = !_showPass),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 22),
                                  SizedBox(
                                    height: 42,
                                    width: double.infinity,
                                    child: ElevatedButton(
                                      onPressed: _loading ? null : _submit,
                                      child: _loading
                                          ? Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: const [
                                                SizedBox(
                                                  width: 15, height: 15,
                                                  child: CircularProgressIndicator(
                                                      strokeWidth: 2, color: Colors.white),
                                                ),
                                                SizedBox(width: 10),
                                                Text('Entrando...',
                                                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                                              ],
                                            )
                                          : Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: const [
                                                Text('Entrar',
                                                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                                                SizedBox(width: 8),
                                                Icon(Icons.arrow_forward, size: 15),
                                              ],
                                            ),
                                    ),
                                  ),
                                  const SizedBox(height: 18),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text('Ainda não tem conta? ',
                                          style: TextStyle(fontSize: 12.5, color: context.textFaint)),
                                      GestureDetector(
                                        onTap: () => context.go('/register'),
                                        child: Text('Criar conta grátis',
                                            style: TextStyle(
                                                fontSize: 12.5, color: context.accent, fontWeight: FontWeight.w700)),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            // Theme toggle (top-right, mirrors web)
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
                                fontSize: 11.5, fontWeight: FontWeight.w500, color: context.textMuted)),
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
}
