var shareImageButton = document.querySelector("#share-image-button")
var createPostArea = document.querySelector("#create-post")
var closeCreatePostModalButton = document.querySelector(
  "#close-create-post-modal-btn"
)
var sharedMomentsArea = document.querySelector("#shared-moments")
var form = document.querySelector("form")
var titleInput = document.querySelector("#title")
var locationInput = document.querySelector("#location")

function openCreatePostModal() {
  setTimeout(() => {
    createPostArea.style.transform = "translateY(0)"
  }, 1)
  
  if (deferredPrompt) {
    deferredPrompt.prompt()

    deferredPrompt.userChoice.then(function (choiceResult) {
      console.log(choiceResult.outcome)

      if (choiceResult.outcome === "dismissed") {
        console.log("User cancelled installation")
      } else {
        console.log("User added to home screen")
      }
    })

    deferredPrompt = null
  }

  // if ("serviceWorker" in navigator) {
  //   navigator.serviceWorker.getRegistration().then((registrations) => {
  //     for (var i = 0; i < registrations.length; i++) {
  //       registrations[i].unregister()
  //     }
  //   })
  // }
}

function closeCreatePostModal() {
  createPostArea.style.transform = "translateY(100vh)"
}

shareImageButton.addEventListener("click", openCreatePostModal)

closeCreatePostModalButton.addEventListener("click", closeCreatePostModal)

// function onSaveButtonClicked() {
//   console.log("clicked")
//   if ("caches" in window) {
//     caches.open("user-requested").then((cache) => {
//       cache.add("https://httpbin.org/get")
//       cache.add("/src/images/sf-boat.jpg")
//     })
//   }
// }

function clearCards() {
  while (sharedMomentsArea.hasChildNodes()) {
    sharedMomentsArea.removeChild(sharedMomentsArea.lastChild)
  }
}

function createCard(data) {
  var cardWrapper = document.createElement("div")
  cardWrapper.className = "shared-moment-card mdl-card mdl-shadow--2dp"
  var cardTitle = document.createElement("div")
  cardTitle.className = "mdl-card__title"
  cardTitle.style.backgroundImage = 'url(' + data.image + ')'
  cardTitle.style.backgroundSize = "cover"
  cardWrapper.appendChild(cardTitle)
  var cardTitleTextElement = document.createElement("h2")
  cardTitleTextElement.style.color = "white"
  cardTitleTextElement.className = "mdl-card__title-text"
  cardTitleTextElement.textContent = data.title
  cardTitle.appendChild(cardTitleTextElement)
  var cardSupportingText = document.createElement("div")
  cardSupportingText.className = "mdl-card__supporting-text"
  cardSupportingText.textContent = data.location
  cardSupportingText.style.textAlign = "center"
  // var cardSaveButton = document.createElement("button")
  // cardSaveButton.textContent = "Save"
  // cardSaveButton.addEventListener("click", onSaveButtonClicked)
  // cardSupportingText.appendChild(cardSaveButton)
  cardWrapper.appendChild(cardSupportingText)
  componentHandler.upgradeElement(cardWrapper)
  sharedMomentsArea.appendChild(cardWrapper)
}

function updateUi(data) {
  clearCards()
  for (var i = 0; i < data.length; i++) {
    createCard(data[i])
  }
}

/// Cache, then network strategy

var url = "https://pwagram-920d5-default-rtdb.firebaseio.com/posts.json"
var networkDataReceived = false

fetch(url)
  .then((res) => {
    return res.json()
  })
  .then((data) => {
    networkDataReceived = true
    console.log("From web", data)
    var dataArray = []
    for (var key in data) {
      dataArray.push(data[key])
    }
    updateUi(dataArray)
  })

if ("indexedDB" in window) {
  readAllData("posts")
    .then(data => {
      if (!networkDataReceived) {
        console.log("from cache", data)
        updateUi(data)
    }
  })
}

function sendData() {
  fetch("https://us-central1-pwagram-920d5.cloudfunctions.net/storePostData", {
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      id: new Date().toISOString(),
      title: titleInput.value,
      location: locationInput.value,
      image: 'https://firebasestorage.googleapis.com/v0/b/pwagram-920d5.appspot.com/o/sf-boat.jpg?alt=media&token=eef295a2-ae41-4098-a66a-d200fe06f8e5'
    })
  })
    .then((res) => {
      console.log("Sent data", res)
      updateUi()
  })
}

form.addEventListener("submit", event => {
  event.preventDefault()

  if (titleInput.value.trim() === "" || locationInput.value.trim() === "") {
    alert("Please enter valid data!")
    return
  }

  closeCreatePostModal()

  if ("serviceWorker" in navigator && "SyncManager" in window) {
    navigator.serviceWorker.ready
      .then(sw => {
        var post = {
          id: new Date().toISOString(),
          title: titleInput.value,
          location: locationInput.value
        }
        writeData("sync-posts", post)
          .then(() => {
            return sw.sync.register("sync-new-posts")
          })
          .then(() => {
            var snackbarContainer = document.querySelector("#confirmation-toast")
            var data = { message: "Your Post was saved for syncing" }
            snackbarContainer.MaterialSnackbar.showSnackbar(data)
          })
          .catch(err => {
            console.log(err)
          })
    })
  } else {
    sendData()
  }

})