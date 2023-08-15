var deferredPrompt
var enableNotificationsButtons = document.querySelectorAll(
    ".enable-notifications"
)

if (!window.Promise) {
    window.Promise = Promise
}

// check if service worker compatible with the browser
if ("serviceWorker" in navigator) {
    navigator.serviceWorker
        .register("/sw.js")
        .then(function () {
            console.log("Service worker registered!")
        })
        .catch(function (err) {
            console.log(err)
        })
}

// prevent the app from suggesting installing prompt
window.addEventListener("beforeinstallprompt", (event) => {
    console.log("beforeinstallprompt fired")
    event.preventDefault()
    deferredPrompt = event
    return false
})

function displayConfirmNotification() {
    if ("serviceWorker" in navigator) {
        var options = {
            body: "You successfully subscrive to our Notification service!",
            icon: "/src/images/icons/app-icon-96x96.png",
            image: "/src/images/sf-boat.jpg",
            dir: "ltr",
            lang: "en-US", // BCP 47
            vibrate: [100, 50, 200],
            badge: "/src/images/icons/app-icon-96x96.png",
            tag: "confirm-notification",
            renotify: true,
            actions: [
                {
                    action: "confirm",
                    title: "Okay",
                    icon: "/src/images/icons/app-icon-96x96.png",
                },
                {
                    action: "cancel",
                    title: "Cancel",
                    icon: "/src/images/icons/app-icon-96x96.png",
                },
            ],
        }
        navigator.serviceWorker.ready.then((swreg) => {
            swreg.showNotification("Successfully subscribed!", options)
        })
    }
}

function configurePushSub() {
    if (!("serviceWorker" in navigator)) {
        return
    }
    var reg
    navigator.serviceWorker.ready
        .then((swreg) => {
            reg = swreg
            return swreg.pushManager.getSubscription()
        })
        .then((sub) => {
            if (sub == null) {
                // create new subscribtion
                var vapidPublicKey =
                    "BFfrnC5EioDWAbuWbxkr0zUfQ46saAo9Cuzayqq7nqgGuOx88d4WweiijCtGrCQuE31u4v9gf0SEAFu5nfGOyW4"
                var convertedVapidPublicKey =
                    urlBase64ToUint8Array(vapidPublicKey)
                return reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidPublicKey,
                })
            } else {
                // we have a subscrition
            }
        })
        .then((newSub) => {
            return fetch(
                "https://pwagram-920d5-default-rtdb.firebaseio.com/subscriptions.json",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    body: JSON.stringify(newSub),
                }
            )
        })
        .then((res) => {
            console.log(res)
            if (res.ok) {
                displayConfirmNotification()
            }
        })
        .catch((err) => {
            console.log(err)
        })
}

function askForNotificationPermission() {
    Notification.requestPermission((result) => {
        console.log("User Choice", result)
        if (result !== "granted") {
            console.log("No notification permission granted")
        } else {
            configurePushSub()
            // displayConfirmNotification()
        }
    })
}

if ("Notification" in window && "serviceWorker" in navigator) {
    for (var i = 0; i < enableNotificationsButtons.length; i++) {
        enableNotificationsButtons[i].style.display = "inline-block"
        enableNotificationsButtons[i].addEventListener(
            "click",
            askForNotificationPermission
        )
    }
}
