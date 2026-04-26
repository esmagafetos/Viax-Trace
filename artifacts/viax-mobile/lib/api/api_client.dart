import 'dart:io';
import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:path_provider/path_provider.dart';

import '../state/server_config.dart';

class ApiClient {
  late final Dio dio;
  late final PersistCookieJar cookieJar;
  late final ServerConfig _config;
  String _lastBaseUrl = '';
  bool _ready = false;

  String get baseUrl => _config.baseUrl;
  ServerConfig get config => _config;

  Future<void> init(ServerConfig config) async {
    if (_ready) return;
    _config = config;
    _lastBaseUrl = _config.baseUrl;
    final dir = await getApplicationDocumentsDirectory();
    final cookieDir = Directory('${dir.path}/.viax_cookies');
    if (!cookieDir.existsSync()) cookieDir.createSync(recursive: true);
    cookieJar = PersistCookieJar(
      ignoreExpires: true,
      storage: FileStorage(cookieDir.path),
    );

    dio = Dio(BaseOptions(
      baseUrl: '${_config.baseUrl}/api',
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 60),
      sendTimeout: const Duration(seconds: 60),
      headers: {
        'Accept': 'application/json',
      },
      validateStatus: (status) => status != null && status < 500,
    ));
    dio.interceptors.add(CookieManager(cookieJar));
    _config.addListener(_onConfigChange);
    _ready = true;
  }

  void _onConfigChange() async {
    final newBase = _config.baseUrl;
    if (newBase == _lastBaseUrl) return;
    _lastBaseUrl = newBase;
    dio.options.baseUrl = '$newBase/api';
    try {
      await cookieJar.deleteAll();
    } catch (_) {}
  }

  Future<bool> testConnection(String url) async {
    final clean = url.endsWith('/') ? url.substring(0, url.length - 1) : url;
    try {
      final probe = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 6),
        receiveTimeout: const Duration(seconds: 6),
        validateStatus: (s) => s != null && s < 500,
      ));
      final r = await probe.get('$clean/api/auth/me');
      return r.statusCode != null && r.statusCode! < 500;
    } catch (_) {
      return false;
    }
  }

  // ── Auth ────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>?> me() async {
    final r = await dio.get('/auth/me');
    if (r.statusCode == 200) return Map<String, dynamic>.from(r.data as Map);
    return null;
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    final r = await dio.post('/auth/login', data: {'email': email, 'password': password});
    if (r.statusCode == 200) return Map<String, dynamic>.from(r.data as Map);
    throw ApiError(r.statusCode ?? 0, _err(r.data));
  }

  Future<Map<String, dynamic>> register(
    String name,
    String email,
    String password, {
    String? birthDate,
  }) async {
    final r = await dio.post('/auth/register', data: {
      'name': name,
      'email': email,
      'password': password,
      if (birthDate != null && birthDate.isNotEmpty) 'birthDate': birthDate,
    });
    if (r.statusCode == 200 || r.statusCode == 201) return Map<String, dynamic>.from(r.data as Map);
    throw ApiError(r.statusCode ?? 0, _err(r.data));
  }

  Future<void> logout() async {
    await dio.post('/auth/logout');
    await cookieJar.deleteAll();
  }

  // ── Users ───────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> updateProfile({String? name, String? birthDate}) async {
    final r = await dio.patch('/users/profile', data: {
      if (name != null) 'name': name,
      if (birthDate != null) 'birthDate': birthDate.isEmpty ? null : birthDate,
    });
    if (r.statusCode == 200) return Map<String, dynamic>.from(r.data as Map);
    throw ApiError(r.statusCode ?? 0, _err(r.data));
  }

  Future<void> updatePassword(String currentPassword, String newPassword) async {
    final r = await dio.patch('/users/password', data: {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
    if (r.statusCode != 200) throw ApiError(r.statusCode ?? 0, _err(r.data));
  }

  Future<Map<String, dynamic>> getSettings() async {
    final r = await dio.get('/users/settings');
    if (r.statusCode == 200) return Map<String, dynamic>.from(r.data as Map);
    throw ApiError(r.statusCode ?? 0, _err(r.data));
  }

  Future<Map<String, dynamic>> updateSettings(Map<String, dynamic> data) async {
    final r = await dio.patch('/users/settings', data: data);
    if (r.statusCode == 200) return Map<String, dynamic>.from(r.data as Map);
    throw ApiError(r.statusCode ?? 0, _err(r.data));
  }

  Future<Map<String, dynamic>> uploadAvatar(File file) async {
    final form = FormData.fromMap({
      'avatar': await MultipartFile.fromFile(file.path, filename: file.path.split('/').last),
    });
    final r = await dio.post('/users/avatar', data: form);
    if (r.statusCode == 200) return Map<String, dynamic>.from(r.data as Map);
    throw ApiError(r.statusCode ?? 0, _err(r.data));
  }

  // ── Dashboard ───────────────────────────────────────────────────────
  Future<Map<String, dynamic>> dashboardSummary() async {
    final r = await dio.get('/dashboard/summary');
    return Map<String, dynamic>.from(r.data as Map);
  }

  Future<List<dynamic>> dashboardRecent() async {
    final r = await dio.get('/dashboard/recent');
    return List<dynamic>.from(r.data as List);
  }

  Future<Map<String, dynamic>> dashboardFinancial() async {
    final r = await dio.get('/dashboard/financial');
    return Map<String, dynamic>.from(r.data as Map);
  }

  // ── Analyses ────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> listAnalyses({int page = 1, int limit = 10}) async {
    final r = await dio.get('/analyses', queryParameters: {'page': page, 'limit': limit});
    return Map<String, dynamic>.from(r.data as Map);
  }

  Future<void> deleteAnalysis(int id) async {
    final r = await dio.delete('/analyses/$id');
    if (r.statusCode != 200 && r.statusCode != 204) {
      throw ApiError(r.statusCode ?? 0, _err(r.data));
    }
  }

  // ── Condominium ─────────────────────────────────────────────────────
  Future<List<dynamic>> condominiumList() async {
    final r = await dio.get('/condominium/list');
    final m = Map<String, dynamic>.from(r.data as Map);
    return List<dynamic>.from(m['condominios'] ?? []);
  }

  String _err(dynamic data) {
    if (data is Map && data['error'] is String) return data['error'];
    if (data is String) return data;
    return 'Erro desconhecido';
  }
}

class ApiError implements Exception {
  final int statusCode;
  final String message;
  ApiError(this.statusCode, this.message);
  @override
  String toString() => 'ApiError($statusCode): $message';
}
