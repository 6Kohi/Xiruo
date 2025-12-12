import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/comic_provider.dart';
import '../providers/auth_provider.dart';

class ComicDetailPage extends StatefulWidget {
  final String comicId;

  const ComicDetailPage({super.key, required this.comicId});

  @override
  State<ComicDetailPage> createState() => _ComicDetailPageState();
}

class _ComicDetailPageState extends State<ComicDetailPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ComicProvider>().loadComicDetail(widget.comicId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('漫画详情'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/'),
        ),
      ),
      body: Consumer<ComicProvider>(
        builder: (context, comicProvider, child) {
          if (comicProvider.isLoading && comicProvider.currentComic == null) {
            return const Center(child: CircularProgressIndicator());
          }

          if (comicProvider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('错误: ${comicProvider.error}'),
                  ElevatedButton(
                    onPressed: () =>
                        comicProvider.loadComicDetail(widget.comicId),
                    child: const Text('重试'),
                  ),
                ],
              ),
            );
          }

          final comic = comicProvider.currentComic;
          if (comic == null) {
            return const Center(child: Text('漫画不存在'));
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Comic Header
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Cover Image
                    Container(
                      width: 120,
                      height: 160,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        color: Colors.grey[300],
                      ),
                      child: comic.coverUrl != null
                          ? ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.network(
                                comic.coverUrl!,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) {
                                  return const Icon(Icons.image_not_supported);
                                },
                              ),
                            )
                          : const Icon(Icons.image_not_supported),
                    ),
                    const SizedBox(width: 16),

                    // Comic Info
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            comic.title,
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                          if (comic.author != null) ...[
                            const SizedBox(height: 8),
                            Text(
                              '作者: ${comic.author}',
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                          ],
                          const SizedBox(height: 8),
                          Text(
                            '状态: ${comic.status ?? "未知"}',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                          if (comic.rating != null) ...[
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                const Icon(
                                  Icons.star,
                                  color: Colors.amber,
                                  size: 16,
                                ),
                                const SizedBox(width: 4),
                                Text('${comic.rating!.toStringAsFixed(1)}'),
                              ],
                            ),
                          ],
                          const SizedBox(height: 16),

                          // Action Buttons
                          Consumer<AuthProvider>(
                            builder: (context, authProvider, child) {
                              return Row(
                                children: [
                                  ElevatedButton.icon(
                                    onPressed:
                                        comicProvider.currentChapters.isNotEmpty
                                        ? () {
                                            final firstChapter = comicProvider
                                                .currentChapters
                                                .first;
                                            context.go(
                                              '/reader/${comic.id}/${firstChapter.id}',
                                            );
                                          }
                                        : null,
                                    icon: const Icon(Icons.play_arrow),
                                    label: const Text('开始阅读'),
                                  ),
                                  const SizedBox(width: 8),
                                  if (authProvider.isAuthenticated)
                                    OutlinedButton.icon(
                                      onPressed: () {
                                        // TODO: Implement favorite toggle
                                        comicProvider.addToFavorites(comic.id);
                                      },
                                      icon: const Icon(Icons.favorite_border),
                                      label: const Text('收藏'),
                                    ),
                                ],
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Categories and Tags
                if (comic.categories.isNotEmpty) ...[
                  const Text(
                    '分类',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: comic.categories.map((category) {
                      return Chip(label: Text(category));
                    }).toList(),
                  ),
                  const SizedBox(height: 16),
                ],

                if (comic.tags.isNotEmpty) ...[
                  const Text(
                    '标签',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: comic.tags.map((tag) {
                      return Chip(
                        label: Text(tag),
                        backgroundColor: Colors.grey[200],
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),
                ],

                // Description
                if (comic.description != null) ...[
                  const Text(
                    '简介',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(comic.description!),
                  const SizedBox(height: 24),
                ],

                // Chapters List
                const Text(
                  '章节列表',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),

                if (comicProvider.currentChapters.isEmpty)
                  const Text('暂无章节')
                else
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: comicProvider.currentChapters.length,
                    itemBuilder: (context, index) {
                      final chapter = comicProvider.currentChapters[index];
                      return ListTile(
                        title: Text(chapter.title),
                        subtitle: chapter.pageCount != null
                            ? Text('${chapter.pageCount} 页')
                            : null,
                        trailing: const Icon(Icons.arrow_forward_ios),
                        onTap: () {
                          context.go('/reader/${comic.id}/${chapter.id}');
                        },
                      );
                    },
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
