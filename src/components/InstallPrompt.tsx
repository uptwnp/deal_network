import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Globe, Zap, Bell, Sparkles } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPromptCardProps {
  onDismiss?: () => void;
}

export function InstallPromptCard({ onDismiss }: InstallPromptCardProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if iOS
    const checkIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(checkIOS);

    // Check if app is already installed (standalone mode)
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      const isStandaloneMode = isStandalone || isIOSStandalone;
      
      setIsInstalled(isStandaloneMode);
      
      // Check localStorage for dismissed state with timestamp
      const dismissedTimestamp = localStorage.getItem('pwa-install-dismissed');
      if (dismissedTimestamp) {
        const dismissedTime = parseInt(dismissedTimestamp, 10);
        const currentTime = Date.now();
        const twoMinutesInMs = 2 * 60 * 1000;
        
        if (currentTime - dismissedTime < twoMinutesInMs) {
          setIsDismissed(true);
        } else {
          localStorage.removeItem('pwa-install-dismissed');
          setIsDismissed(false);
        }
      }
    };

    checkIfInstalled();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // Show prompt after a short delay
      const autoPromptShown = sessionStorage.getItem('pwa-auto-prompt-shown');
      if (!autoPromptShown) {
        setTimeout(async () => {
          try {
            await promptEvent.prompt();
            sessionStorage.setItem('pwa-auto-prompt-shown', 'true');
            const choiceResult = await promptEvent.userChoice;
            if (choiceResult.outcome === 'accepted') {
              setDeferredPrompt(null);
            }
          } catch (error) {
            console.error('Error showing install prompt:', error);
            sessionStorage.removeItem('pwa-auto-prompt-shown');
          }
        }, 3000);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsDismissed(false);
      localStorage.removeItem('pwa-install-dismissed');
      sessionStorage.removeItem('pwa-auto-prompt-shown');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Re-check on visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkIfInstalled();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Set up interval to re-check dismissal status
    const checkInterval = setInterval(() => {
      const dismissedTimestamp = localStorage.getItem('pwa-install-dismissed');
      if (dismissedTimestamp) {
        const dismissedTime = parseInt(dismissedTimestamp, 10);
        const currentTime = Date.now();
        const twoMinutesInMs = 2 * 60 * 1000;
        
        if (currentTime - dismissedTime >= twoMinutesInMs) {
          localStorage.removeItem('pwa-install-dismissed');
          setIsDismissed(false);
        }
      }
    }, 30000);

    // Animate in after mount
    setTimeout(() => setIsVisible(true), 100);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(checkInterval);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      const isAndroid = /Android/.test(navigator.userAgent);
      
      if (isIOS) {
        alert('To install Dealer Network:\n1. Tap the Share button (square with arrow)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" in the top right');
      } else if (isAndroid) {
        alert('To install Dealer Network:\n1. Tap the menu (⋮) in your browser\n2. Tap "Install app" or "Add to Home screen"');
      } else {
        alert('Look for the install icon in your browser\'s address bar, or check the browser menu for "Install" option.');
      }
      return;
    }

    const autoPromptShown = sessionStorage.getItem('pwa-auto-prompt-shown');
    if (autoPromptShown) {
      const isAndroid = /Android/.test(navigator.userAgent);
      if (isAndroid) {
        alert('To install Dealer Network:\n1. Tap the menu (⋮) in your browser\n2. Tap "Install app" or "Add to Home screen"');
      } else {
        alert('Look for the install icon in your browser\'s address bar, or check the browser menu for "Install" option.');
      }
      return;
    }

    try {
      await deferredPrompt.prompt();
      sessionStorage.setItem('pwa-auto-prompt-shown', 'true');
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error('Error showing install prompt:', error);
      sessionStorage.removeItem('pwa-auto-prompt-shown');
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setDeferredPrompt(null);
    if (onDismiss) {
      onDismiss();
    }
  };

  // Don't show if installed or dismissed
  if (isInstalled || isDismissed) {
    return null;
  }

  // Show prompt if we have a deferredPrompt or we're on iOS
  const shouldShow = deferredPrompt || (isIOS && !isInstalled);

  if (!shouldShow) {
    return null;
  }

  return (
    <div 
      className={`w-full relative overflow-hidden rounded-2xl transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Main card with gradient background */}
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-1 rounded-2xl shadow-2xl">
        <div className="bg-white rounded-xl p-5 sm:p-6">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all z-10"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header section */}
          <div className="flex items-start gap-4 mb-4 pr-8">
            {/* Icon with animated background */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-lg">
                <Smartphone className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0 pt-1">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                Install Dealer Network
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                Get faster access and a better experience
              </p>
            </div>
          </div>

          {/* Benefits grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Faster</div>
                <div className="text-xs text-gray-600">Quick loading</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <div className="flex-shrink-0 p-2 bg-indigo-100 rounded-lg">
                <Globe className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Offline</div>
                <div className="text-xs text-gray-600">Works offline</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
              <div className="flex-shrink-0 p-2 bg-purple-100 rounded-lg">
                <Bell className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Notifications</div>
                <div className="text-xs text-gray-600">Stay updated</div>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 mb-5 leading-relaxed">
            Install our app to access properties faster, work offline, and get instant notifications about new listings.
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleInstall}
              className="flex-1 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-5 h-5" />
              <span>Install Now</span>
              <Sparkles className="w-4 h-4 opacity-80" />
            </button>
            <button
              onClick={handleDismiss}
              className="px-6 py-3.5 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all duration-200 border-2 border-gray-200"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Legacy component name for backward compatibility
export function InstallPrompt() {
  return <InstallPromptCard />;
}
