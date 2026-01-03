import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// Safe localStorage access for Safari private browsing
const getLanguageSafely = (): 'en' | 'ar' => {
  try {
    return (localStorage.getItem('currentLanguage') || 'ar') as 'en' | 'ar';
  } catch {
    return 'ar';
  }
};

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const translations = {
  en: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    tryAgain: 'Try Again',
    returnHome: 'Return to Home'
  },
  ar: {
    title: 'حدث خطأ ما',
    description: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى أو الاتصال بالدعم إذا استمرت المشكلة.',
    tryAgain: 'حاول مرة أخرى',
    returnHome: 'العودة للرئيسية'
  }
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleTryAgain = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReturnHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const lang = getLanguageSafely();
      const t = translations[lang];
      const isRtl = lang === 'ar';

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background" dir={isRtl ? 'rtl' : 'ltr'}>
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>{t.title}</CardTitle>
              </div>
              <CardDescription>{t.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {import.meta.env.DEV && this.state.error && (
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40" dir="ltr">
                  {this.state.error.message}
                </pre>
              )}
              <Button onClick={this.handleTryAgain} variant="outline" className="w-full gap-2">
                <RefreshCw className="h-4 w-4" />
                {t.tryAgain}
              </Button>
              <Button onClick={this.handleReturnHome} className="w-full">
                {t.returnHome}
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
