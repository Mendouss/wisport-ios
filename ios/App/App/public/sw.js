/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "b5b6fb5d240df91b129adf7c21e4a5e9"
  }, {
    "url": "pwa-512x512.png",
    "revision": "ddf176a4e5d1d55e681b020906e82b32"
  }, {
    "url": "pwa-192x192.png",
    "revision": "315ac702a3aabeb77566940691e8f592"
  }, {
    "url": "index.html",
    "revision": "0599d9d1bfe29cab46ed301f6ea38020"
  }, {
    "url": "icon.svg",
    "revision": "c128186848480fd64f71255e28ad332c"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "a465979a8b824a2ef7d9026da3737670"
  }, {
    "url": "assets/index-PjG92Pgu.css",
    "revision": null
  }, {
    "url": "assets/index-DxAlohFb.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "a465979a8b824a2ef7d9026da3737670"
  }, {
    "url": "icon.svg",
    "revision": "c128186848480fd64f71255e28ad332c"
  }, {
    "url": "pwa-192x192.png",
    "revision": "315ac702a3aabeb77566940691e8f592"
  }, {
    "url": "pwa-512x512.png",
    "revision": "ddf176a4e5d1d55e681b020906e82b32"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "b5b6fb5d240df91b129adf7c21e4a5e9"
  }, {
    "url": "manifest.webmanifest",
    "revision": "4f1a073db1ed2007663d80e8fdc77963"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
