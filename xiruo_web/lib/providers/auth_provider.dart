import 'package:flutter/foundation.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  User? _user;
  bool _isLoading = false;
  String? _error;

  User? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;

  Future<bool> login(String username, String password) async {
    _setLoading(true);
    _clearError();

    try {
      final request = LoginRequest(username: username, password: password);
      final response = await _apiService.login(request);
      _user = response.user;
      notifyListeners();
      return true;
    } catch (e) {
      _setError('登录失败: ${e.toString()}');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> register(String username, String email, String password) async {
    _setLoading(true);
    _clearError();

    try {
      final request = RegisterRequest(
        username: username,
        email: email,
        password: password,
      );
      await _apiService.register(request);
      return true;
    } catch (e) {
      _setError('注册失败: ${e.toString()}');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> logout() async {
    try {
      await _apiService.logout();
    } catch (e) {
      // Log error but don't prevent logout
      debugPrint('Logout error: $e');
    } finally {
      _user = null;
      notifyListeners();
    }
  }

  Future<void> checkAuthStatus() async {
    final token = await _apiService.getAuthToken();
    if (token != null) {
      // TODO: Validate token with server
      // For now, assume token is valid if it exists
    }
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String error) {
    _error = error;
    notifyListeners();
  }

  void _clearError() {
    _error = null;
  }
}
