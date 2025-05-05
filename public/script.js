// Get user info from localStorage or backend
async function getUserInfo() {
  const userInfoKey = "userInfo";
  const storedUserInfo = localStorage.getItem(userInfoKey);

  if (storedUserInfo) {
    console.log("User info found in localStorage:", JSON.parse(storedUserInfo));
    return JSON.parse(storedUserInfo);
  }

  try {
    const response = await fetch("/api/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}), // Add required payload if needed
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user info");
    }

    const data = await response.json();
    localStorage.setItem(userInfoKey, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error("Error fetching user info:", error);
    return null;
  }
}

// Call on page load
getUserInfo();

// SPLIDE Carousel Init
document.addEventListener("DOMContentLoaded", function () {
  var splide = new Splide(".splide", {
    type: "loop",
    perPage: 3,
    pagination: true,
    arrows: true,
    lazyLoad: "nearby",
    perMove: 1,
    breakpoints: {
      640: {
        perPage: 2,
      },
      480: {
        arrows: false,
        perPage: 1,
        focus: "center",
      },
    },
  });
  splide.mount();
});

// jQuery Form Submit Handler
$(document).ready(function () {
  $("#btn_message").on("click", function (e) {
    e.preventDefault();

    const name = $("#guest_name").val().trim();
    const whatsapp = $("#whatsapp_number").val().trim();
    const invitationCode = $("input[name='invitation_code']").val();
    const guestId = $("input[name='guest_id']").val();
    const orderId = $("input[name='order_detail_invitation_id']").val();

    if (name === "") {
      return alert("Name is required.");
    }

    if (!/^\d{10}$/.test(whatsapp)) {
      return alert("Please enter a valid 10-digit WhatsApp number.");
    }

    const btn = $(this);
    btn.html("Sending...");
    btn.attr("disabled", true);

    const data = {
      name,
      number: "+91" + whatsapp,
    };

    fetch("/api/add-number", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then((response) => {
        $("#submit_feedback").removeClass("hidden").fadeIn("slow");
        btn.html("Submitted ✅");
      })
      .catch((err) => {
        console.error("Submission failed:", err);
        alert("Something went wrong. Please try again.");
        btn.html("Submit");
        btn.removeAttr("disabled");
      });
  });
});

// Custom alert using AlertifyJS
function alert(msg) {
  alertify
    .alert()
    .set({
      title: "Information",
      transition: "slide",
      message: msg,
      movable: true,
      closable: false,
    })
    .show();
}

// Audio Controls
const audio2 = document.getElementById("player");

function play_pause(btn) {
  if (audio2.paused) {
    audio2.play();
    btn.dataset.status = "pause";
    document.getElementById("audio_control").className = "play";
  } else {
    audio2.pause();
    btn.dataset.status = "play";
    document.getElementById("audio_control").className = "pause";
  }
}

// Loop the song on end
audio2.addEventListener("ended", () => {
  audio2.currentTime = 0;
  audio2.play();
});

// Pause on tab change, resume on return
document.addEventListener("visibilitychange", function () {
  if (document.hidden) {
    if (!audio2.paused) {
      audio2.pause();
      audio2.dataset.shouldResume = "true";
    }
  } else {
    if (audio2.dataset.shouldResume === "true") {
      audio2.play();
      audio2.dataset.shouldResume = "false";
    }
  }
});

// Lightbox init
lightbox.option({
  resizeDuration: 200,
  wrapAround: true,
  disableScrolling: true,
});
