/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
var admin = require('firebase-admin')
var cors = require('cors')({ origin: true })
var webPush = require("web-push")

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

var serviceAccount = require("./pwagram_fb-key.json")

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://pwagram-920d5-default-rtdb.firebaseio.com/"
})


exports.storePostData = onRequest((request, response) => {
    cors(request, response, () => {
        admin.database().ref('posts').push({
            id: request.body.id,
            title: request.body.title,
            location: request.body.location,
            image: request.body.image
        })
        .then(() => {
            webPush.setVapidDetails("mailto:hello@reginaeva.de", "BFfrnC5EioDWAbuWbxkr0zUfQ46saAo9Cuzayqq7nqgGuOx88d4WweiijCtGrCQuE31u4v9gf0SEAFu5nfGOyW4", "bmjgU4AdyRmzyjriP_vHL-LgYILwwYZ610G0yv4Dccw")
            return admin.database().ref("subscriptios").once('value')
        })
        .then(subscriptions => {
            subscriptions.forEach(sub => {
                var pushConfig = {
                    endpoint: sub.val().endpoint,
                    keys: {
                        auth: sub.val().keys.auth,
                        p256dh: sub.val().keys.p256dh
                    }
                }
                webPush.sendNotification(pushConfig, JSON.stringify({ title: "New Post", content: "New Post added!", openUrl: "/help"}))
                    .catch(err => {
                    console.log(err)
                })
            })
            response.status(201).json({ message: "Data Stored", id: request.body.id })
        })
        .catch(() => {
            response.status(500).json({error: err})
        })
    })
});
