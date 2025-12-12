import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/comic_provider.dart';

class ReaderPage extends StatefulWidget {
  final String comicId;
  final String chapterId;

  const ReaderPage({super.key, required this.comicId, required this.chapterId});

  @override
  State<ReaderPage> createState() => _ReaderPageState();
}

class _ReaderPageState extends State<ReaderPage> {
  final PageController _pageController = PageController();
  int _currentPage = 0;
  bool _showControls = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ComicProvider>().loadChapterPages(
        widget.comicId,
        widget.chapterId,
      );
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: _showControls
          ? AppBar(
              backgroundColor: Colors.black.withOpacity(0.7),
              foregroundColor: Colors.white,
              title: const Text('漫画阅读器'),
              leading: IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => context.go('/comic/${widget.comicId}'),
              ),
              actions: [
                Consumer<ComicProvider>(
                  builder: (context, comicProvider, child) {
                    final totalPages = comicProvider.currentPages.length;
                    if (totalPages == 0) return const SizedBox.shrink();

                    return Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: Center(
                        child: Text(
                          '${_currentPage + 1} / $totalPages',
                          style: const TextStyle(color: Colors.white),
                        ),
                      ),
                    );
                  },
                ),
              ],
            )
          : null,
      body: Consumer<ComicProvider>(
        builder: (context, comicProvider, child) {
          if (comicProvider.isLoading && comicProvider.currentPages.isEmpty) {
            return const Center(
              child: CircularProgressIndicator(color: Colors.white),
            );
          }

          if (comicProvider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '错误: ${comicProvider.error}',
                    style: const TextStyle(color: Colors.white),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => comicProvider.loadChapterPages(
                      widget.comicId,
                      widget.chapterId,
                    ),
                    child: const Text('重试'),
                  ),
                ],
              ),
            );
          }

          final pages = comicProvider.currentPages;
          if (pages.isEmpty) {
            return const Center(
              child: Text('暂无页面内容', style: TextStyle(color: Colors.white)),
            );
          }

          return GestureDetector(
            onTap: () {
              setState(() {
                _showControls = !_showControls;
              });
            },
            child: PageView.builder(
              controller: _pageController,
              onPageChanged: (index) {
                setState(() {
                  _currentPage = index;
                });
              },
              itemCount: pages.length,
              itemBuilder: (context, index) {
                final page = pages[index];
                return Center(
                  child: InteractiveViewer(
                    minScale: 0.5,
                    maxScale: 3.0,
                    child: Image.network(
                      page.imageUrl,
                      fit: BoxFit.contain,
                      loadingBuilder: (context, child, loadingProgress) {
                        if (loadingProgress == null) return child;
                        return Center(
                          child: CircularProgressIndicator(
                            value: loadingProgress.expectedTotalBytes != null
                                ? loadingProgress.cumulativeBytesLoaded /
                                      loadingProgress.expectedTotalBytes!
                                : null,
                            color: Colors.white,
                          ),
                        );
                      },
                      errorBuilder: (context, error, stackTrace) {
                        return const Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.error_outline,
                                color: Colors.white,
                                size: 48,
                              ),
                              SizedBox(height: 8),
                              Text(
                                '图片加载失败',
                                style: TextStyle(color: Colors.white),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
      bottomNavigationBar: _showControls
          ? Container(
              color: Colors.black.withOpacity(0.7),
              padding: const EdgeInsets.all(16.0),
              child: Consumer<ComicProvider>(
                builder: (context, comicProvider, child) {
                  final totalPages = comicProvider.currentPages.length;
                  if (totalPages == 0) return const SizedBox.shrink();

                  return Row(
                    children: [
                      IconButton(
                        onPressed: _currentPage > 0
                            ? () {
                                _pageController.previousPage(
                                  duration: const Duration(milliseconds: 300),
                                  curve: Curves.easeInOut,
                                );
                              }
                            : null,
                        icon: const Icon(
                          Icons.arrow_back_ios,
                          color: Colors.white,
                        ),
                      ),
                      Expanded(
                        child: Slider(
                          value: _currentPage.toDouble(),
                          min: 0,
                          max: (totalPages - 1).toDouble(),
                          divisions: totalPages - 1,
                          onChanged: (value) {
                            final page = value.round();
                            _pageController.animateToPage(
                              page,
                              duration: const Duration(milliseconds: 300),
                              curve: Curves.easeInOut,
                            );
                          },
                        ),
                      ),
                      IconButton(
                        onPressed: _currentPage < totalPages - 1
                            ? () {
                                _pageController.nextPage(
                                  duration: const Duration(milliseconds: 300),
                                  curve: Curves.easeInOut,
                                );
                              }
                            : null,
                        icon: const Icon(
                          Icons.arrow_forward_ios,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  );
                },
              ),
            )
          : null,
    );
  }
}
