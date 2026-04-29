import 'dart:io';
import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:path_provider/path_provider.dart';

/// Base URL of the ViaX:Trace backend.
///
/// Hardcoded to the official Render-hosted API. Can be overridden at build
/// time with `--dart-define=API_BASE=https://your-host` (useful for staging
/// or self-hosted deployments) — never asked from the end user.
const String kApiBase = String.fromEnvironment(
  'API_BASE',
  defaultValue: 'https://viax-trace-api.onrender.com',
);

class ApiClient {
  late final Dio dio;
  late final PersistCookieJar cookieJar;
  bool _ready = false;

  String get baseUrl => kApiBase;

  Future<void> init() async {
    if (_ready) return;
    final dir = await getApplicationDocumentsDirectory();
    final cookieDir = Directory('${dir.path}/.viax_cookies');
    if (!cookieDir.existsSync()) cookieDir.createSync(recursive: true);
    cookieJar = PersistCookieJar(
      ignoreExpires: true,
      storage: FileStorage(cookieDir.path),
    );

    dio = Dio(BaseOptions(
      baseUrl: '$kApiBase/api',
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 60),
      sendTimeout: const Duration(seconds: 60),
      headers: {
        'Accept': 'application/json',
      },
      validateStatus: (status) => status != null && status < 500,
    ));
    dio.interceptors.add(CookieManager(cookieJar));
    _ready = true;
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

  // ── Diagnostics ────────────────────────────────────────────────────
  /// Public endpoint — returns operator-defined maintenance message (or null).
  Future<Map<String, dynamic>> getMaintenance() async {
    final r = await dio.get('/diag/maintenance');
    return Map<String, dynamic>.from(r.data as Map);
  }

  /// Authenticated — pings every geocoding provider and returns each one's
  /// reachability + latency.
  Future<Map<String, dynamic>> getProvidersStatus() async {
    final r = await dio.get('/diag/providers');
    return Map<String, dynamic>.from(r.data as Map);
  }

  /// Authenticated — validates an AI provider key against the provider's
  /// model-list endpoint. Returns { ok, status, latencyMs, message }.
  Future<Map<String, dynamic>> testAiKey(String provider, String apiKey) async {
    final r = await dio.post('/diag/ai-key', data: {
      'provider': provider,
      'apiKey': apiKey,
    });
    return Map<String, dynamic>.from(r.data as Map);
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
    try {
      final r = await dio.post('/users/avatar', data: form);
      if (r.statusCode == 200) return Map<String, dynamic>.from(r.data as Map);
      throw ApiError(r.statusCode ?? 0, _err(r.data));
    } on DioException catch (e) {
      throw ApiError(e.response?.statusCode ?? 0, _dioErr(e));
    }
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

  Future<Map<String, dynamic>> getAnalysis(int id) async {
    final r = await dio.get('/analyses/$id');
    if (r.statusCode == 200) return Map<String, dynamic>.from(r.data as Map);
    throw ApiError(r.statusCode ?? 0, _err(r.data));
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
    if (data is String && data.isNotEmpty) return data;
    return 'Erro desconhecido';
  }

  String _dioErr(DioException e) {
    if (e.response != null) return _err(e.response!.data);
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
        return 'Tempo de conexão esgotado. Verifique sua internet.';
      case DioExceptionType.sendTimeout:
        return 'Envio demorou demais. Tente novamente.';
      case DioExceptionType.receiveTimeout:
        return 'Servidor demorou para responder. Tente novamente.';
      case DioExceptionType.connectionError:
        return 'Falha de conexão. Verifique sua internet.';
      default:
        return e.message ?? 'Erro de rede.';
    }
  }
}

class ApiError implements Exception {
  final int statusCode;
  final String message;
  ApiError(this.statusCode, this.message);
  @override
  String toString() => 'ApiError($statusCode): $message';
}
