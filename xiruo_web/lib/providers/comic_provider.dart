import 'package:flutter/foundation.dart';
import '../models/comic.dart';
import '../models/chapter.dart';
import '../services/api_service.dart';

class ComicProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<Comic> _comics = [];
  List<Comic> _trendingComics = [];
  List<Comic> _favorites = [];
  Comic? _currentComic;
  List<Chapter> _currentChapters = [];
  List<ChapterPage> _currentPages = [];

  bool _isLoading = false;
  String? _error;

  // Pagination
  int _currentPage = 1;
  bool _hasMore = true;

  // Getters
  List<Comic> get comics => _comics;
  List<Comic> get trendingComics => _trendingComics;
  List<Comic> get favorites => _favorites;
  Comic? get currentComic => _currentComic;
  List<Chapter> get currentChapters => _currentChapters;
  List<ChapterPage> get currentPages => _currentPages;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasMore => _hasMore;

  Future<void> loadTrendingComics() async {
    _setLoading(true);
    _clearError();

    try {
      _trendingComics = await _apiService.getTrendingComics();
      notifyListeners();
    } catch (e) {
      _setError('加载热门漫画失败: ${e.toString()}');
    } finally {
      _setLoading(false);
    }
  }

  Future<void> searchComics({
    String? query,
    List<String>? categories,
    bool refresh = false,
  }) async {
    if (refresh) {
      _currentPage = 1;
      _comics.clear();
      _hasMore = true;
    }

    _setLoading(true);
    _clearError();

    try {
      final result = await _apiService.getComics(
        page: _currentPage,
        search: query,
        categories: categories,
      );

      if (refresh) {
        _comics = result.comics;
      } else {
        _comics.addAll(result.comics);
      }

      _hasMore = result.hasNext;
      _currentPage++;
      notifyListeners();
    } catch (e) {
      _setError('搜索漫画失败: ${e.toString()}');
    } finally {
      _setLoading(false);
    }
  }

  Future<void> loadComicDetail(String comicId) async {
    _setLoading(true);
    _clearError();

    try {
      _currentComic = await _apiService.getComicDetail(comicId);
      _currentChapters = await _apiService.getComicChapters(comicId);
      notifyListeners();
    } catch (e) {
      _setError('加载漫画详情失败: ${e.toString()}');
    } finally {
      _setLoading(false);
    }
  }

  Future<void> loadChapterPages(String comicId, String chapterId) async {
    _setLoading(true);
    _clearError();

    try {
      _currentPages = await _apiService.getChapterPages(comicId, chapterId);
      notifyListeners();
    } catch (e) {
      _setError('加载章节页面失败: ${e.toString()}');
    } finally {
      _setLoading(false);
    }
  }

  Future<void> loadFavorites() async {
    _setLoading(true);
    _clearError();

    try {
      _favorites = await _apiService.getFavorites();
      notifyListeners();
    } catch (e) {
      _setError('加载收藏失败: ${e.toString()}');
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> addToFavorites(int comicId) async {
    try {
      await _apiService.addToFavorites(comicId);
      await loadFavorites(); // Refresh favorites
      return true;
    } catch (e) {
      _setError('添加收藏失败: ${e.toString()}');
      return false;
    }
  }

  Future<bool> removeFromFavorites(int comicId) async {
    try {
      await _apiService.removeFromFavorites(comicId);
      await loadFavorites(); // Refresh favorites
      return true;
    } catch (e) {
      _setError('移除收藏失败: ${e.toString()}');
      return false;
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

  void clearCurrentComic() {
    _currentComic = null;
    _currentChapters.clear();
    _currentPages.clear();
    notifyListeners();
  }
}
