const { onRequest } = require("firebase-functions/v2/https")
var admin = require("firebase-admin")
var cors = require("cors")({ origin: true })
var webPush = require("web-push")
var fs = require("fs")
var UUID = require("uuid-v4")
var os = require("os")
var Busboy = require("busboy")
var path = require("path")

var serviceAccount = require("./pwagram_fb-key.json")

var gcconfig = {
    projectId: "pwagram-920d5",
    keyFileName: "pwagram_fb-key.json",
}

var gcs = require("@google-cloud/storage")(gcconfig)

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://pwagram-920d5-default-rtdb.firebaseio.com/",
})

exports.storePostData = onRequest((request, response) => {
    cors(request, response, () => {
        var uuid = UUID()
        const busboy = Busboy({ headers: request.headers })

        // These objects will store the values (file + fields) extracted from busboy
        let upload
        const fields = {}

        // This callback will be invoked for each file uploaded
        busboy.on("file", (fieldname, file, info) => {
            const { filename, encoding, mimetype } = info
            console.log(
                `File [${fieldname}] filename: ${filename}, encoding: ${encoding}, mimetype: ${mimetype}`
            )
            const filepath = path.join(os.tmpdir(), filename)
            upload = { file: filepath, type: mimetype }
            file.pipe(fs.createWriteStream(filepath))
        })

        // This will invoked on every field detected
        busboy.on(
            "field",
            function (
                fieldname,
                val,
                fieldnameTruncated,
                valTruncated,
                encoding,
                mimetype
            ) {
                fields[fieldname] = val
            }
        )

        busboy.on("finish", () => {
            var bucket = gcs.bucket("pwagram-920d5.appspot.com")
            bucket.upload(
                upload.file,
                {
                    uploadType: "media",
                    metadata: {
                        metadata: {
                            contentType: upload.type,
                            firebaseStorageDownloadTokens: uuid,
                        },
                    },
                },
                (err, uploadedFile) => {
                    if (!err) {
                        admin
                            .database()
                            .ref("posts")
                            .push({
                                id: fields.id,
                                title: fields.title,
                                location: fields.location,
                                rawLocation: {
                                    lat: "0",
                                    lng: "0",
                                },
                                image:
                                    "https://firebasestorage.googleapis.com/v0/b/" +
                                    bucket.name +
                                    "/o/" +
                                    encodeURIComponent(uploadedFile.name) +
                                    "?alt=media&token=" +
                                    uuid,
                            })
                            .then(() => {
                                webPush.setVapidDetails(
                                    "mailto:hello@reginaeva.de",
                                    "BFfrnC5EioDWAbuWbxkr0zUfQ46saAo9Cuzayqq7nqgGuOx88d4WweiijCtGrCQuE31u4v9gf0SEAFu5nfGOyW4",
                                    "bmjgU4AdyRmzyjriP_vHL-LgYILwwYZ610G0yv4Dccw"
                                )
                                return admin
                                    .database()
                                    .ref("subscriptios")
                                    .once("value")
                            })
                            .then((subscriptions) => {
                                subscriptions.forEach((sub) => {
                                    var pushConfig = {
                                        endpoint: sub.val().endpoint,
                                        keys: {
                                            auth: sub.val().keys.auth,
                                            p256dh: sub.val().keys.p256dh,
                                        },
                                    }
                                    webPush
                                        .sendNotification(
                                            pushConfig,
                                            JSON.stringify({
                                                title: "New Post",
                                                content: "New Post added!",
                                                openUrl: "/help",
                                            })
                                        )
                                        .catch((err) => {
                                            console.log(err)
                                        })
                                })
                                response.status(201).json({
                                    message: "Data Stored",
                                    id: fields.id,
                                })
                            })
                            .catch(() => {
                                response.status(500).json({ error: err })
                            })
                    } else {
                        console.log(err)
                    }
                }
            )
        })
        busboy.end(request.rawBody)
    })
})
