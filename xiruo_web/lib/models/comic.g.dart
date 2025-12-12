// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'comic.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Comic _$ComicFromJson(Map<String, dynamic> json) => Comic(
  id: (json['id'] as num).toInt(),
  sourceId: (json['sourceId'] as num).toInt(),
  sourceComicId: json['sourceComicId'] as String,
  title: json['title'] as String,
  author: json['author'] as String?,
  description: json['description'] as String?,
  coverUrl: json['coverUrl'] as String?,
  status: json['status'] as String?,
  categories: (json['categories'] as List<dynamic>)
      .map((e) => e as String)
      .toList(),
  tags: (json['tags'] as List<dynamic>).map((e) => e as String).toList(),
  rating: (json['rating'] as num?)?.toDouble(),
  viewCount: (json['viewCount'] as num).toInt(),
  favoriteCount: (json['favoriteCount'] as num).toInt(),
  createdAt: DateTime.parse(json['createdAt'] as String),
  updatedAt: DateTime.parse(json['updatedAt'] as String),
);

Map<String, dynamic> _$ComicToJson(Comic instance) => <String, dynamic>{
  'id': instance.id,
  'sourceId': instance.sourceId,
  'sourceComicId': instance.sourceComicId,
  'title': instance.title,
  'author': instance.author,
  'description': instance.description,
  'coverUrl': instance.coverUrl,
  'status': instance.status,
  'categories': instance.categories,
  'tags': instance.tags,
  'rating': instance.rating,
  'viewCount': instance.viewCount,
  'favoriteCount': instance.favoriteCount,
  'createdAt': instance.createdAt.toIso8601String(),
  'updatedAt': instance.updatedAt.toIso8601String(),
};

ComicSearchResult _$ComicSearchResultFromJson(Map<String, dynamic> json) =>
    ComicSearchResult(
      comics: (json['comics'] as List<dynamic>)
          .map((e) => Comic.fromJson(e as Map<String, dynamic>))
          .toList(),
      totalCount: (json['totalCount'] as num).toInt(),
      page: (json['page'] as num).toInt(),
      pageSize: (json['pageSize'] as num).toInt(),
      hasNext: json['hasNext'] as bool,
    );

Map<String, dynamic> _$ComicSearchResultToJson(ComicSearchResult instance) =>
    <String, dynamic>{
      'comics': instance.comics,
      'totalCount': instance.totalCount,
      'page': instance.page,
      'pageSize': instance.pageSize,
      'hasNext': instance.hasNext,
    };
