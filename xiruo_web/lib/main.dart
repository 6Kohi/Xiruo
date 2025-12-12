import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'providers/auth_provider.dart';
import 'providers/comic_provider.dart';
import 'pages/home_page.dart';
import 'pages/login_page.dart';
import 'pages/comic_detail_page.dart';
import 'pages/reader_page.dart';

void main() {
  runApp(const XiruoWebApp());
}

class XiruoWebApp extends StatelessWidget {
  const XiruoWebApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ComicProvider()),
      ],
      child: MaterialApp.router(
        title: 'Xiruo Web - 漫画阅读平台',
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
          useMaterial3: true,
        ),
        routerConfig: _router,
      ),
    );
  }
}

final GoRouter _router = GoRouter(
  routes: [
    GoRoute(path: '/', builder: (context, state) => const HomePage()),
    GoRoute(path: '/login', builder: (context, state) => const LoginPage()),
    GoRoute(
      path: '/comic/:id',
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        return ComicDetailPage(comicId: id);
      },
    ),
    GoRoute(
      path: '/reader/:comicId/:chapterId',
      builder: (context, state) {
        final comicId = state.pathParameters['comicId']!;
        final chapterId = state.pathParameters['chapterId']!;
        return ReaderPage(comicId: comicId, chapterId: chapterId);
      },
    ),
  ],
);
