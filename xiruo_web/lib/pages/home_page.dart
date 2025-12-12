import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../providers/comic_provider.dart';
import '../components/comic_card.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ComicProvider>().loadTrendingComics();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Xiruo Web - 漫画阅读平台'),
        actions: [
          Consumer<AuthProvider>(
            builder: (context, authProvider, child) {
              if (authProvider.isAuthenticated) {
                return PopupMenuButton<String>(
                  onSelected: (value) {
                    if (value == 'logout') {
                      authProvider.logout();
                    }
                  },
                  itemBuilder: (context) => [
                    PopupMenuItem(
                      value: 'profile',
                      child: Text('用户: ${authProvider.user?.username}'),
                    ),
                    const PopupMenuItem(value: 'logout', child: Text('退出登录')),
                  ],
                  child: Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: CircleAvatar(
                      child: Text(
                        authProvider.user?.username
                                .substring(0, 1)
                                .toUpperCase() ??
                            'U',
                      ),
                    ),
                  ),
                );
              } else {
                return TextButton(
                  onPressed: () => context.go('/login'),
                  child: const Text('登录'),
                );
              }
            },
          ),
        ],
      ),
      body: Consumer<ComicProvider>(
        builder: (context, comicProvider, child) {
          if (comicProvider.isLoading && comicProvider.trendingComics.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (comicProvider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('错误: ${comicProvider.error}'),
                  ElevatedButton(
                    onPressed: () => comicProvider.loadTrendingComics(),
                    child: const Text('重试'),
                  ),
                ],
              ),
            );
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Search Bar
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(8.0),
                  ),
                  child: TextField(
                    decoration: const InputDecoration(
                      hintText: '搜索漫画...',
                      border: InputBorder.none,
                      icon: Icon(Icons.search),
                    ),
                    onSubmitted: (query) {
                      // TODO: Implement search navigation
                    },
                  ),
                ),
                const SizedBox(height: 24),

                // Trending Comics Section
                const Text(
                  '热门漫画',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),

                if (comicProvider.trendingComics.isEmpty)
                  const Center(child: Text('暂无热门漫画'))
                else
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithResponsiveColumns(
                      minColumnWidth: 200,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                    ),
                    itemCount: comicProvider.trendingComics.length,
                    itemBuilder: (context, index) {
                      final comic = comicProvider.trendingComics[index];
                      return ComicCard(
                        comic: comic,
                        onTap: () => context.go('/comic/${comic.id}'),
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

class SliverGridDelegateWithResponsiveColumns extends SliverGridDelegate {
  const SliverGridDelegateWithResponsiveColumns({
    required this.minColumnWidth,
    this.crossAxisSpacing = 0.0,
    this.mainAxisSpacing = 0.0,
    this.childAspectRatio = 1.0,
  });

  final double minColumnWidth;
  final double crossAxisSpacing;
  final double mainAxisSpacing;
  final double childAspectRatio;

  @override
  SliverGridLayout getLayout(SliverConstraints constraints) {
    final double usableWidth = constraints.crossAxisExtent - crossAxisSpacing;
    final int columnCount = (usableWidth / (minColumnWidth + crossAxisSpacing))
        .floor();
    final double columnWidth =
        (usableWidth - (columnCount - 1) * crossAxisSpacing) / columnCount;

    return SliverGridRegularTileLayout(
      crossAxisCount: columnCount,
      mainAxisStride: columnWidth / childAspectRatio + mainAxisSpacing,
      crossAxisStride: columnWidth + crossAxisSpacing,
      childMainAxisExtent: columnWidth / childAspectRatio,
      childCrossAxisExtent: columnWidth,
      reverseCrossAxis: false,
    );
  }

  @override
  bool shouldRelayout(SliverGridDelegateWithResponsiveColumns oldDelegate) {
    return oldDelegate.minColumnWidth != minColumnWidth ||
        oldDelegate.crossAxisSpacing != crossAxisSpacing ||
        oldDelegate.mainAxisSpacing != mainAxisSpacing ||
        oldDelegate.childAspectRatio != childAspectRatio;
  }
}
