// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'chapter.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Chapter _$ChapterFromJson(Map<String, dynamic> json) => Chapter(
  id: (json['id'] as num).toInt(),
  comicId: (json['comicId'] as num).toInt(),
  sourceChapterId: json['sourceChapterId'] as String,
  title: json['title'] as String,
  chapterNumber: (json['chapterNumber'] as num?)?.toDouble(),
  pageCount: (json['pageCount'] as num?)?.toInt(),
  createdAt: DateTime.parse(json['createdAt'] as String),
);

Map<String, dynamic> _$ChapterToJson(Chapter instance) => <String, dynamic>{
  'id': instance.id,
  'comicId': instance.comicId,
  'sourceChapterId': instance.sourceChapterId,
  'title': instance.title,
  'chapterNumber': instance.chapterNumber,
  'pageCount': instance.pageCount,
  'createdAt': instance.createdAt.toIso8601String(),
};

ChapterPage _$ChapterPageFromJson(Map<String, dynamic> json) => ChapterPage(
  pageNumber: (json['pageNumber'] as num).toInt(),
  imageUrl: json['imageUrl'] as String,
  width: (json['width'] as num?)?.toInt(),
  height: (json['height'] as num?)?.toInt(),
);

Map<String, dynamic> _$ChapterPageToJson(ChapterPage instance) =>
    <String, dynamic>{
      'pageNumber': instance.pageNumber,
      'imageUrl': instance.imageUrl,
      'width': instance.width,
      'height': instance.height,
    };
