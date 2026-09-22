import 'package:facebook_app_events/facebook_app_events.dart';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

const String kAppUrl = 'https://www.app.sunset-app.fr/web';

final FacebookAppEvents facebookAppEvents = FacebookAppEvents();

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // Reports the app launch to Meta App Events, for install/ad attribution.
  // Requires facebook_app_id / facebook_client_token to be set (see
  // android/app/src/main/res/values/strings.xml and ios/Runner/Info.plist).
  facebookAppEvents.activateApp();
  runApp(const SunsetApp());
}

class SunsetApp extends StatelessWidget {
  const SunsetApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sunset',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: Colors.deepOrange,
        useMaterial3: true,
      ),
      home: const WebViewScreen(),
    );
  }
}

class WebViewScreen extends StatefulWidget {
  const WebViewScreen({super.key});

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  late final WebViewController _controller;
  double _loadProgress = 0;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) {
            setState(() => _loadProgress = progress / 100);
          },
          onPageStarted: (_) {
            setState(() => _hasError = false);
          },
          onWebResourceError: (error) {
            // Ignore sub-resource errors; only surface a failure for the
            // main frame so a broken image/script doesn't blank the app.
            if (error.isForMainFrame ?? true) {
              setState(() => _hasError = true);
            }
          },
        ),
      )
      ..loadRequest(Uri.parse(kAppUrl));
  }

  Future<void> _reload() async {
    setState(() => _hasError = false);
    await _controller.loadRequest(Uri.parse(kAppUrl));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: PopScope(
          canPop: false,
          onPopInvokedWithResult: (didPop, result) async {
            if (didPop) return;
            if (await _controller.canGoBack()) {
              await _controller.goBack();
            }
          },
          child: Stack(
            children: [
              if (_hasError)
                _ErrorView(onRetry: _reload)
              else
                WebViewWidget(controller: _controller),
              if (_loadProgress < 1 && !_hasError)
                LinearProgressIndicator(value: _loadProgress),
            ],
          ),
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off, size: 48, color: Colors.grey),
            const SizedBox(height: 16),
            const Text(
              'Impossible de charger Sunset.\nVérifiez votre connexion internet.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: const Text('Réessayer')),
          ],
        ),
      ),
    );
  }
}
