import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/auth_provider.dart';
import '../theme/theme.dart';

/// Avatar do usuário que renderiza corretamente todos os formatos suportados
/// pelo backend:
///   * `data:image/...;base64,XXXX` → decodifica e usa [Image.memory]
///   * `http(s)://...`              → [Image.network] direto
///   * caminho relativo (`/uploads/...`) → prefixa com [ApiClient.baseUrl]
///   * vazio / nulo / inválido       → fallback para a inicial do nome
///
/// O bug anterior fazia `${baseUrl}data:image/...` que nunca carrega. Esse
/// widget centraliza a lógica e é usado tanto pelo Layout (top bar)
/// quanto pelas telas de Configurações.
class UserAvatar extends StatelessWidget {
  final String name;
  final String? avatarUrl;
  final double size;
  final double fontSize;
  final Color? background;
  final Color? foreground;
  final BoxBorder? border;

  const UserAvatar({
    super.key,
    required this.name,
    this.avatarUrl,
    this.size = 34,
    this.fontSize = 13,
    this.background,
    this.foreground,
    this.border,
  });

  String get _initial {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return 'U';
    return trimmed.characters.first.toUpperCase();
  }

  Widget _fallback(BuildContext context) {
    return Center(
      child: Text(
        _initial,
        style: TextStyle(
          fontSize: fontSize,
          fontWeight: FontWeight.w700,
          color: foreground ?? context.accent,
        ),
      ),
    );
  }

  /// Decodifica o `data:` URL → bytes. Retorna `null` se inválido.
  static Uint8List? decodeDataUrl(String url) {
    try {
      final commaIdx = url.indexOf(',');
      if (commaIdx == -1) return null;
      final payload = url.substring(commaIdx + 1);
      // Aceita só base64 explicitamente (todos os uploads do backend são base64).
      return base64Decode(payload);
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final url = avatarUrl?.trim();
    final hasUrl = url != null && url.isNotEmpty;
    final bg = background ?? context.accentDim;

    Widget child;
    if (!hasUrl) {
      child = _fallback(context);
    } else if (url.startsWith('data:')) {
      final bytes = decodeDataUrl(url);
      child = bytes == null
          ? _fallback(context)
          : Image.memory(
              bytes,
              fit: BoxFit.cover,
              width: size,
              height: size,
              gaplessPlayback: true,
              errorBuilder: (_, __, ___) => _fallback(context),
            );
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      child = Image.network(
        url,
        fit: BoxFit.cover,
        width: size,
        height: size,
        gaplessPlayback: true,
        errorBuilder: (_, __, ___) => _fallback(context),
      );
    } else {
      // Caminho relativo no servidor — prefixa com baseUrl.
      final baseUrl = context.read<AuthProvider>().api.baseUrl;
      final fullUrl = url.startsWith('/') ? '$baseUrl$url' : '$baseUrl/$url';
      child = Image.network(
        fullUrl,
        fit: BoxFit.cover,
        width: size,
        height: size,
        gaplessPlayback: true,
        errorBuilder: (_, __, ___) => _fallback(context),
      );
    }

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: bg,
        shape: BoxShape.circle,
        border: border,
      ),
      clipBehavior: Clip.antiAlias,
      child: child,
    );
  }
}
