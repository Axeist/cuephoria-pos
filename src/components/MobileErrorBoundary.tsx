import React, { Component, ErrorInfo, ReactNode } from 'react';
import { isNativePlatform } from '@/utils/capacitor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import {
  clearChunkRecoveryGuard,
  isChunkLoadError,
  tryChunkRecoveryReload,
} from '@/utils/chunkRecovery';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isStaleDeploy: boolean;
  isRecovering: boolean;
}

class MobileErrorBoundary extends Component<Props, State> {
  private recoverTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isStaleDeploy: false,
      isRecovering: false,
    };
  }

  componentWillUnmount() {
    if (this.recoverTimer) clearTimeout(this.recoverTimer);
  }

  static getDerivedStateFromError(error: Error): Partial<State> | null {
    if (isChunkLoadError(error)) {
      // Avoid flashing the generic crash screen while we reload for a new build.
      return { isRecovering: true, hasError: false, error: null, errorInfo: null };
    }
    return {
      hasError: true,
      error,
      errorInfo: null,
      isStaleDeploy: false,
      isRecovering: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);

    if (isChunkLoadError(error)) {
      const reloaded = tryChunkRecoveryReload(error.message || 'chunk load failure');
      if (reloaded) return;

      // Cooldown exhausted — retry once after a short delay (CDN/index may lag).
      this.recoverTimer = setTimeout(() => {
        const forced = tryChunkRecoveryReload('chunk load failure (retry)', {
          force: true,
        });
        if (!forced) {
          this.setState({
            hasError: true,
            error,
            errorInfo,
            isStaleDeploy: true,
            isRecovering: false,
          });
        }
      }, 1200);
      return;
    }

    this.setState({
      error,
      errorInfo,
      isStaleDeploy: false,
      isRecovering: false,
    });
  }

  handleReload = () => {
    clearChunkRecoveryGuard();
    const url = new URL(window.location.href);
    url.searchParams.set('_v', String(Date.now()));
    window.location.replace(url.toString());
  };

  handleGoHome = () => {
    clearChunkRecoveryGuard();
    const url = new URL('/', window.location.origin);
    url.searchParams.set('_v', String(Date.now()));
    window.location.replace(url.toString());
  };

  render() {
    if (this.state.isRecovering) {
      return (
        <div className="min-h-screen bg-cuephoria-dark flex items-center justify-center p-4">
          <div className="text-center space-y-3" role="status" aria-live="polite">
            <RefreshCw className="h-10 w-10 text-cuephoria-lightpurple animate-spin mx-auto" />
            <p className="text-lg font-medium text-white">Updating application…</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              A new version was deployed. Reloading to load the latest files.
            </p>
          </div>
        </div>
      );
    }

    if (this.state.hasError) {
      const stale = this.state.isStaleDeploy;
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
                {stale ? 'Update required' : 'Oops! Something went wrong'}
              </CardTitle>
              <CardDescription className="text-gray-400 mt-2">
                {stale
                  ? 'This tab was open during a new release. Reload once to load the latest version.'
                  : isNativePlatform()
                    ? "The app encountered an unexpected error. Don't worry, we can fix this!"
                    : 'The application encountered an unexpected error.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
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

              <div className="text-center text-sm text-gray-400">
                {stale ? (
                  <p>Your data is safe — only the app files needed refreshing.</p>
                ) : (
                  <>
                    <p>Try reloading the app or returning to the home screen.</p>
                    <p className="mt-2">If the problem persists, please contact support.</p>
                  </>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
              <Button
                onClick={this.handleReload}
                className="w-full bg-cuephoria-lightpurple hover:bg-cuephoria-lightpurple/80"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {stale ? 'Load latest version' : 'Reload App'}
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
