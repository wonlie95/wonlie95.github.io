(() => {
  'use strict';

  let activeRequest;
  let navigating = false;

  const dynamicSelectors = [
    '#brand .pjax',
    '#imgs',
    '#main',
    '#sidebar .contents.panel.pjax',
    '#sidebar .related.panel.pjax',
    '#quick .prev',
    '#quick .next',
  ];

  const syncAttributes = (current, next) => {
    [...current.attributes].forEach((attribute) => {
      if (attribute.name !== 'id' && !next.hasAttribute(attribute.name))
        current.removeAttribute(attribute.name);
    });
    [...next.attributes].forEach((attribute) => {
      if (attribute.name !== 'id')
        current.setAttribute(attribute.name, attribute.value);
    });
  };

  const replaceDynamicContent = (nextDocument) => {
    dynamicSelectors.forEach((selector) => {
      const current = document.querySelector(selector);
      const next = nextDocument.querySelector(selector);
      if (!current || !next)
        return;
      syncAttributes(current, next);
      current.replaceChildren(...[...next.childNodes].map(node => document.importNode(node, true)));
    });

    document.title = nextDocument.title;
    ['link[rel="canonical"]', 'meta[name="description"]'].forEach((selector) => {
      const current = document.head.querySelector(selector);
      const next = nextDocument.head.querySelector(selector);
      if (current && next)
        current.replaceWith(document.importNode(next, true));
    });

    const nextConfig = nextDocument.querySelector('script[data-config]');
    if (nextConfig?.textContent && window.LOCAL) {
      try {
        const nextLocal = Function(`${nextConfig.textContent}; return LOCAL;`)();
        Object.keys(window.LOCAL).forEach(key => delete window.LOCAL[key]);
        Object.assign(window.LOCAL, nextLocal);
      }
      catch (error) {
        console.error('Unable to refresh page configuration', error);
      }
    }
  };

  const navigate = async (url, pushHistory = true) => {
    if (navigating)
      activeRequest?.abort();
    navigating = true;
    activeRequest = new AbortController();
    document.documentElement.classList.add('seamless-loading');

    try {
      const response = await fetch(url.href, {
        signal: activeRequest.signal,
        headers: { 'X-Requested-With': 'SeamlessNavigation' },
      });
      if (!response.ok)
        throw new Error(`Navigation failed: ${response.status}`);
      const html = await response.text();
      const nextDocument = new DOMParser().parseFromString(html, 'text/html');
      replaceDynamicContent(nextDocument);
      if (pushHistory)
        history.pushState({ seamless: true }, '', url.href);
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (typeof window.__shokaxSiteRefresh === 'function')
        await window.__shokaxSiteRefresh(0);
      document.dispatchEvent(new CustomEvent('shokax:page-loaded', { detail: { url: url.href } }));
    }
    catch (error) {
      if (error?.name !== 'AbortError')
        window.location.assign(url.href);
    }
    finally {
      navigating = false;
      document.documentElement.classList.remove('seamless-loading');
    }
  };

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.target && link.target !== '_self' || link.hasAttribute('download') || link.hasAttribute('data-no-seamless'))
      return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin || url.protocol !== 'http:' && url.protocol !== 'https:')
      return;
    if (/\.(?:xml|json|rss|atom|zip|7z|rar|pdf|mp3|mp4|png|jpe?g|gif|webp|svg)$/i.test(url.pathname))
      return;
    if (url.pathname === window.location.pathname && url.search === window.location.search) {
      if (url.hash)
        return;
      event.preventDefault();
      return;
    }
    event.preventDefault();
    navigate(url, true);
  });

  window.addEventListener('popstate', () => navigate(new URL(window.location.href), false));
  history.replaceState({ seamless: true }, '', window.location.href);
})();
