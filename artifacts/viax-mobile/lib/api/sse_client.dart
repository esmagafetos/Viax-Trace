import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:cookie_jar/cookie_jar.dart';
import 'package:http/http.dart' as http;

import 'api_client.dart';

/// SSE event from /api/process/upload and /api/condominium/process.
class SseEvent {
  final String event;
  final dynamic data;
  SseEvent(this.event, this.data);
}

/// Streams a multipart upload to an SSE endpoint.
///
/// [filePath] is the local file. [extraFields] are extra multipart fields
/// (e.g. `condominioId` for the condominium endpoint).
Stream<SseEvent> uploadAndStream({
  required ApiClient api,
  required String endpointPath, // e.g. /process/upload
  required String filePath,
  String fileFieldName = 'arquivo',
  Map<String, String> extraFields = const {},
}) async* {
  final url = Uri.parse('${api.baseUrl}/api$endpointPath');
  final cookies = await api.cookieJar.loadForRequest(url);
  final cookieHeader = cookies.map((c) => '${c.name}=${c.value}').join('; ');

  final request = http.MultipartRequest('POST', url)
    ..headers['Accept'] = 'text/event-stream'
    ..headers['Cookie'] = cookieHeader;
  extraFields.forEach((k, v) => request.fields[k] = v);

  final f = File(filePath);
  request.files.add(await http.MultipartFile.fromPath(
    fileFieldName,
    f.path,
    filename: f.path.split(Platform.pathSeparator).last,
  ));

  final streamed = await request.send();

  if (streamed.statusCode >= 400) {
    final body = await streamed.stream.bytesToString();
    yield SseEvent('error', {'error': body.isNotEmpty ? body : 'HTTP ${streamed.statusCode}'});
    return;
  }

  // Capture set-cookie headers (if the server set new ones).
  final setCookie = streamed.headers['set-cookie'];
  if (setCookie != null) {
    try {
      api.cookieJar.saveFromResponse(url, [Cookie.fromSetCookieValue(setCookie)]);
    } catch (_) {}
  }

  String buffer = '';
  await for (final chunk in streamed.stream.transform(utf8.decoder)) {
    buffer += chunk;
    while (true) {
      final idx = buffer.indexOf('\n\n');
      if (idx < 0) break;
      final part = buffer.substring(0, idx);
      buffer = buffer.substring(idx + 2);

      String eventName = 'message';
      String dataStr = '';
      for (final raw in part.split('\n')) {
        final line = raw.trimRight();
        if (line.startsWith('event: ')) {
          eventName = line.substring(7).trim();
        } else if (line.startsWith('data: ')) {
          dataStr = line.substring(6).trim();
        }
      }
      if (dataStr.isEmpty) continue;
      try {
        final parsed = jsonDecode(dataStr);
        yield SseEvent(eventName, parsed);
      } catch (_) {
        // ignore malformed JSON
      }
    }
  }
}
