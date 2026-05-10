
export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_ID;

export const initGA = () => {
  if (!GA_MEASUREMENT_ID) return;

  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script1);

  const script2 = document.createElement('script');
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}', {
      page_path: window.location.pathname,
    });
  `;
  document.head.appendChild(script2);
};

export const trackPageView = (path: string) => {
  if (typeof window !== 'undefined' && (window as any).gtag && GA_MEASUREMENT_ID) {
    (window as any).gtag('config', GA_MEASUREMENT_ID, {
      page_path: path,
    });
  }
};

export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).gtag && GA_MEASUREMENT_ID) {
    (window as any).gtag('event', eventName, params);
  }
};
