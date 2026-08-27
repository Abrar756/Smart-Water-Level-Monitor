const CACHE_NAME = "smart-water-monitor-v1";

const APP_FILES = [
    "/",
    "/static/manifest.json",
    "/static/icons/icon-192.png",
    "/static/icons/icon-512.png",
    "/static/icons/icon-512-maskable.png"
];


// ============================================================
// INSTALL
// ============================================================

self.addEventListener("install", event => {

    event.waitUntil(

        caches.open(CACHE_NAME)
            .then(cache => {

                return cache.addAll(APP_FILES);

            })

    );

    self.skipWaiting();

});


// ============================================================
// ACTIVATE
// ============================================================

self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys().then(cacheNames => {

            return Promise.all(

                cacheNames
                    .filter(
                        name => name !== CACHE_NAME
                    )
                    .map(
                        name => caches.delete(name)
                    )

            );

        })

    );

    self.clients.claim();

});


// ============================================================
// FETCH
// ============================================================

self.addEventListener("fetch", event => {

    const request = event.request;

    // Never cache API requests.
    // Your water level, pump status and controls
    // must always communicate with the live server.

    if (
        request.url.includes("/api/")
    ) {

        return;

    }


    // Only handle GET requests.

    if (
        request.method !== "GET"
    ) {

        return;

    }


    event.respondWith(

        fetch(request)
            .then(response => {

                return response;

            })
            .catch(() => {

                return caches.match(request);

            })

    );

});
