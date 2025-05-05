lightbox.option({
    resizeDuration: 200,
    wrapAround: true,
    disableScrolling: true,
  });
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
          number: "+91" + whatsapp
        };
    
        // REPLACE URL with your actual API endpoint
        fetch("https://amrutha.up.railway.app/api/add-number", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
          .then((res) => res.json())
          .then((response) => {
            // Show confirmation
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
  