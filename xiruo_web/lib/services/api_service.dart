import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../models/comic.dart';
import '../models/chapter.dart';

class ApiService {
  static const String baseUrl = 'http://localhost:8080/api';
  late final Dio _dio;

  ApiService() {
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final prefs = await SharedPreferences.getInstance();
          final token = prefs.getString('auth_token');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) {
          // Handle common errors
          if (error.response?.statusCode == 401) {
            // Token expired, redirect to login
            _clearAuthToken();
          }
          handler.next(error);
        },
      ),
    );
  }

  // Authentication APIs
  Future<LoginResponse> login(LoginRequest request) async {
    final response = await _dio.post('/auth/login', data: request.toJson());
    final loginResponse = LoginResponse.fromJson(response.data);
    await _saveAuthToken(loginResponse.token);
    return loginResponse;
  }

  Future<User> register(RegisterRequest request) async {
    final response = await _dio.post('/auth/register', data: request.toJson());
    return User.fromJson(response.data);
  }

  Future<void> logout() async {
    await _dio.post('/auth/logout');
    await _clearAuthToken();
  }

  // Comic APIs
  Future<ComicSearchResult> getComics({
    int page = 1,
    int pageSize = 20,
    String? search,
    List<String>? categories,
  }) async {
    final queryParams = <String, dynamic>{'page': page, 'pageSize': pageSize};

    if (search != null && search.isNotEmpty) {
      queryParams['search'] = search;
    }

    if (categories != null && categories.isNotEmpty) {
      queryParams['categories'] = categories.join(',');
    }

    final response = await _dio.get('/comics', queryParameters: queryParams);
    return ComicSearchResult.fromJson(response.data);
  }

  Future<Comic> getComicDetail(String comicId) async {
    final response = await _dio.get('/comics/$comicId');
    return Comic.fromJson(response.data);
  }

  Future<List<Chapter>> getComicChapters(String comicId) async {
    final response = await _dio.get('/comics/$comicId/chapters');
    return (response.data as List)
        .map((json) => Chapter.fromJson(json))
        .toList();
  }

  Future<List<ChapterPage>> getChapterPages(
    String comicId,
    String chapterId,
  ) async {
    final response = await _dio.get(
      '/comics/$comicId/chapters/$chapterId/pages',
    );
    return (response.data as List)
        .map((json) => ChapterPage.fromJson(json))
        .toList();
  }

  Future<List<Comic>> getTrendingComics() async {
    final response = await _dio.get('/comics/trending');
    return (response.data as List).map((json) => Comic.fromJson(json)).toList();
  }

  // Favorites APIs
  Future<List<Comic>> getFavorites() async {
    final response = await _dio.get('/favorites');
    return (response.data as List).map((json) => Comic.fromJson(json)).toList();
  }

  Future<void> addToFavorites(int comicId) async {
    await _dio.post('/favorites', data: {'comicId': comicId});
  }

  Future<void> removeFromFavorites(int comicId) async {
    await _dio.delete('/favorites/$comicId');
  }

  // Helper methods
  Future<void> _saveAuthToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  Future<void> _clearAuthToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
  }

  Future<String?> getAuthToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }
}
