import 'package:flutter/foundation.dart';

import '../api/api_client.dart';

class AppUser {
  final int id;
  final String name;
  final String email;
  final String? avatarUrl;
  final String? birthDate;
  final String? createdAt;

  AppUser({
    required this.id,
    required this.name,
    required this.email,
    this.avatarUrl,
    this.birthDate,
    this.createdAt,
  });

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        id: (j['id'] as num).toInt(),
        name: j['name'] as String? ?? '',
        email: j['email'] as String? ?? '',
        avatarUrl: j['avatarUrl'] as String?,
        birthDate: j['birthDate'] as String?,
        createdAt: j['createdAt'] as String?,
      );

  AppUser copyWith({String? name, String? avatarUrl, String? birthDate}) => AppUser(
        id: id,
        name: name ?? this.name,
        email: email,
        avatarUrl: avatarUrl ?? this.avatarUrl,
        birthDate: birthDate ?? this.birthDate,
        createdAt: createdAt,
      );
}

class AuthProvider extends ChangeNotifier {
  final ApiClient api;
  AppUser? _user;
  bool _loading = true;

  AuthProvider(this.api);

  AppUser? get user => _user;
  bool get loading => _loading;
  bool get isAuthenticated => _user != null;

  Future<void> bootstrap() async {
    _loading = true;
    notifyListeners();
    try {
      final j = await api.me();
      if (j != null) _user = AppUser.fromJson(j);
    } catch (_) {
      _user = null;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> login(String email, String password) async {
    final res = await api.login(email, password);
    final u = res['user'];
    if (u is Map) _user = AppUser.fromJson(Map<String, dynamic>.from(u));
    notifyListeners();
  }

  Future<void> register(String name, String email, String password, {String? birthDate}) async {
    final res = await api.register(name, email, password, birthDate: birthDate);
    final u = res['user'];
    if (u is Map) _user = AppUser.fromJson(Map<String, dynamic>.from(u));
    notifyListeners();
  }

  Future<void> logout() async {
    try {
      await api.logout();
    } catch (_) {}
    _user = null;
    notifyListeners();
  }

  void setUser(AppUser u) {
    _user = u;
    notifyListeners();
  }
}
