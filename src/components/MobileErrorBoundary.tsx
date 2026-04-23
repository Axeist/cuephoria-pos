import React, { Component, ErrorInfo, ReactNode } from 'react';
import { isNativePlatform } from '@/utils/capacitor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

const CHUNK_RELOAD_GUARD_KEY = "__cuephoria_boundary_chunk_reload_at";
const CHUNK_RELOAD_COOLDOWN_MS = 15_000;

function isChunkLoadError(error: Error): boolean {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("failed to load dynamic import module") ||
    message.includes("failed to load module script") ||
    message.includes("loading chunk") ||
    message.includes("chunkloaderror") ||
    (message.includes("importing") && message.includes("failed"))
  );
}

function tryChunkRecoveryReload(reason: string): boolean {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY) || 0);
    if (Date.now() - last < CHUNK_RELOAD_COOLDOWN_MS) {
      console.warn("[error-boundary chunk-recover] skip reload, recently attempted");
      return false;
    }
    sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    // If sessionStorage is unavailable, still try one reload.
  }

  console.warn(`[error-boundary chunk-recover] forcing reload (${reason})`);
  const url = new URL(window.location.href);
  url.searchParams.set("_v", String(Date.now()));
  window.location.replace(url.toString());
  return true;
}

/**
 * Mobile-aware Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI
 */
class MobileErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console
    console.error('Error caught by boundary:', error, errorInfo);

    // Auto-recover stale deploy chunk mismatches without user action.
    if (isChunkLoadError(error)) {
      const reloading = tryChunkRecoveryReload(error.message || "chunk load failure");
      if (reloading) return;
    }
    
    // You could also log to an error reporting service here
    // Example: Sentry.captureException(error);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    // Reload the page/app
    if (isNativePlatform()) {
      // On native, just reset the state and re-render
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
      // Optionally, you could reload the webview
      window.location.reload();
    } else {
      // On web, reload the page
      window.location.reload();
    }
  };

  handleGoHome = () => {
    // Navigate to home
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cuephoria-dark flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-red-500/20 bg-cuephoria-darker">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-red-500/10 rounded-full">
                  <AlertCircle className="h-12 w-12 text-red-500" />
                </div>
              </div>
              <CardTitle className="text-2xl text-white">
                Oops! Something went wrong
              </CardTitle>
              <CardDescription className="text-gray-400 mt-2">
                {isNativePlatform() 
                  ? "The app encountered an unexpected error. Don't worry, we can fix this!"
                  : "The application encountered an unexpected error."
                }
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Error details (only in development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-xs font-mono text-red-400 break-words">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-400 cursor-pointer hover:underline">
                        Stack trace
                      </summary>
                      <pre className="text-xs text-red-400 mt-2 overflow-x-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
              
              {/* User-friendly message */}
              <div className="text-center text-sm text-gray-400">
                <p>Try reloading the app or returning to the home screen.</p>
                <p className="mt-2">If the problem persists, please contact support.</p>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col gap-2">
              <Button
                onClick={this.handleReload}
                className="w-full bg-cuephoria-lightpurple hover:bg-cuephoria-lightpurple/80"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload App
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="w-full"
              >
                <Home className="mr-2 h-4 w-4" />
                Go to Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MobileErrorBoundary;
