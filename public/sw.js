importScripts("/src/js/idb.js")
importScripts("/src/js/utility.js")

var CACHE_STATIC_NAME = "static-v69"
var CACHE_DYNAMIC_NAME = "dynamic-v40"
var STATIC_FILES = [
    "/",
    "/index.html",
    "/offline.html",
    "/src/js/app.js",
    "/src/js/utility.js",
    "/src/js/feed.js",
    "/src/js/idb.js",
    "/src/js/promise.js",
    "/src/js/fetch.js",
    "/src/js/material.min.js",
    "/src/css/app.css",
    "/src/css/feed.css",
    "/src/images/main-image.jpg",
    "https://fonts.googleapis.com/css?family=Roboto:400,700",
    "https://fonts.googleapis.com/icon?family=Material+Icons",
    "https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css",
]

// function trimCache(cacheName, maxItems) {
//   caches.open(cacheName).then((cache) => {
//     return cache.keys().then((keys) => {
//       if (keys.length > maxItems) {
//         cache.delete(keys[0]).then(trimCache(cacheName, maxItems))
//       }
//     })
//   })
// }

self.addEventListener("install", function (event) {
    console.log("[Service Worker] Installing Service Worker ...", event)
    event.waitUntil(
        caches.open(CACHE_STATIC_NAME).then((cache) => {
            console.log("[Service Worker] Precaching App Shell...")
            cache.addAll(STATIC_FILES)
        })
    )
})

self.addEventListener("activate", function (event) {
    console.log("[Service Worker] Activating Service Worker ....", event)
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key != CACHE_STATIC_NAME && key != CACHE_DYNAMIC_NAME) {
                        console.log("[Service worker] Removing old cache.", key)
                        return caches.delete(key)
                    }
                })
            )
        })
    )
    return self.clients.claim()
})

function isInArray(string, array) {
    for (var i = 0; i < array.length; i++) {
        if (array[i] === string) {
            return true
        }
    }
    return false
}

self.addEventListener("fetch", function (event) {
    var url = "https://pwagram-920d5-default-rtdb.firebaseio.com/posts"

    if (event.request.url.indexOf(url) > -1) {
        event.respondWith(
            fetch(event.request).then((res) => {
                // trimCache(CACHE_DYNAMIC_NAME, 3)
                var cloneRes = res.clone()
                clearAllData("posts")
                    .then(() => {
                        return cloneRes.json()
                    })
                    .then((data) => {
                        for (var key in data) {
                            writeData("posts", data[key])
                        }
                    })
                return res
            })
        )
    } else if (
        // cache only strategy
        isInArray(event.request.url, STATIC_FILES)
    ) {
        event.respondWith(caches.match(event.request))
    } else {
        event.respondWith(
            caches.match(event.request).then((response) => {
                if (response) {
                    return response
                } else {
                    return fetch(event.request)
                        .then((res) => {
                            return caches
                                .open(CACHE_DYNAMIC_NAME)
                                .then((cache) => {
                                    // trimCache(CACHE_DYNAMIC_NAME, 3)
                                    cache.put(event.request.url, res.clone())
                                    return res
                                })
                        })
                        .catch((err) => {
                            return caches
                                .open(CACHE_STATIC_NAME)
                                .then((cache) => {
                                    if (
                                        event.request.headers
                                            .get("accept")
                                            .includes("text/html")
                                    ) {
                                        return cache.match("/offline.html")
                                    }
                                })
                        })
                }
            })
        )
    }
})

self.addEventListener("sync", (event) => {
    console.log("[Service Worker] Background syncing", event)
    if (event.tag === "sync-new-posts") {
        console.log("[Service worker] Syncing new Posts")
        event.waitUntil(
            readAllData("sync-posts").then((data) => {
                for (var dt of data) {
                    var postData = new FormData()
                    postData.append("id", dt.id)
                    postData.append("title", dt.title)
                    postData.append("location", dt.location)
                    postData.append("rawLocationLat", dt.rawLocation.lat)
                    postData.append("rawLocationLng", dt.rawLocation.lng)
                    postData.append("file", dt.picture, dt.id + ".png")
                    console.log("post data from sync", postData)

                    fetch(
                        "https://us-central1-pwagram-920d5.cloudfunctions.net/storePostData",
                        {
                            method: "POST",
                            body: postData,
                        }
                    )
                        .then((res) => {
                            console.log("Sent data", res)
                            if (res.ok) {
                                res.json().then((resData) => {
                                    deleteItemFromData("sync-posts", resData.id)
                                })
                            }
                        })
                        .catch((err) => {
                            console.log("Error while sending data", err)
                        })
                }
            })
        )
    }
})

self.addEventListener("notificationclick", (event) => {
    var notification = event.notification
    var action = event.action
    console.log(notification)
    if (action === "confirm") {
        console.log("Confirm was chosen")
        notification.close()
    } else {
        console.log(action)
        event.waitUntil(
            clients.matchAll().then((clis) => {
                var client = clis.find((item) => {
                    return item.visibilityState === "visible"
                })
                if (client !== undefined) {
                    client.navigate(notification.data.url)
                    client.focus()
                } else {
                    clients.openWindow(notification.data.url)
                }
                notification.close()
            })
        )
    }
})

self.addEventListener("notificationclose", (event) => {
    console.log("Notification was close", event)
})

self.addEventListener("push", (event) => {
    console.log("Push notification received", event)
    var data = {
        title: "New!",
        content: "Something new happened!",
        openUrl: "/",
    }
    if (event.data) {
        data = JSON.parse(event.data.text())
    }
    var options = {
        body: data.content,
        icon: "/src/images/icons/app-icon-96x96.png",
        badge: "/src/images/icons/app-icon-96x96.png",
        data: {
            url: data.openUrl,
        },
    }
    event.waitUntil(self.registration.showNotification(data.title, options))
})
