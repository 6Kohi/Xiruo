import 'package:json_annotation/json_annotation.dart';

part 'comic.g.dart';

@JsonSerializable()
class Comic {
  final int id;
  final int sourceId;
  final String sourceComicId;
  final String title;
  final String? author;
  final String? description;
  final String? coverUrl;
  final String? status;
  final List<String> categories;
  final List<String> tags;
  final double? rating;
  final int viewCount;
  final int favoriteCount;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Comic({
    required this.id,
    required this.sourceId,
    required this.sourceComicId,
    required this.title,
    this.author,
    this.description,
    this.coverUrl,
    this.status,
    required this.categories,
    required this.tags,
    this.rating,
    required this.viewCount,
    required this.favoriteCount,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Comic.fromJson(Map<String, dynamic> json) => _$ComicFromJson(json);
  Map<String, dynamic> toJson() => _$ComicToJson(this);
}

@JsonSerializable()
class ComicSearchResult {
  final List<Comic> comics;
  final int totalCount;
  final int page;
  final int pageSize;
  final bool hasNext;

  const ComicSearchResult({
    required this.comics,
    required this.totalCount,
    required this.page,
    required this.pageSize,
    required this.hasNext,
  });

  factory ComicSearchResult.fromJson(Map<String, dynamic> json) =>
      _$ComicSearchResultFromJson(json);
  Map<String, dynamic> toJson() => _$ComicSearchResultToJson(this);
}
