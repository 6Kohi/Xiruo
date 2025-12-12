import 'package:json_annotation/json_annotation.dart';

part 'chapter.g.dart';

@JsonSerializable()
class Chapter {
  final int id;
  final int comicId;
  final String sourceChapterId;
  final String title;
  final double? chapterNumber;
  final int? pageCount;
  final DateTime createdAt;

  const Chapter({
    required this.id,
    required this.comicId,
    required this.sourceChapterId,
    required this.title,
    this.chapterNumber,
    this.pageCount,
    required this.createdAt,
  });

  factory Chapter.fromJson(Map<String, dynamic> json) =>
      _$ChapterFromJson(json);
  Map<String, dynamic> toJson() => _$ChapterToJson(this);
}

@JsonSerializable()
class ChapterPage {
  final int pageNumber;
  final String imageUrl;
  final int? width;
  final int? height;

  const ChapterPage({
    required this.pageNumber,
    required this.imageUrl,
    this.width,
    this.height,
  });

  factory ChapterPage.fromJson(Map<String, dynamic> json) =>
      _$ChapterPageFromJson(json);
  Map<String, dynamic> toJson() => _$ChapterPageToJson(this);
}
