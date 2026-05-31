document.getElementById("deliveryForm").addEventListener("submit", function (e) {
  e.preventDefault();

  // You can collect values here
  const inputs = this.querySelectorAll("input");
  let valid = true;

  inputs.forEach(input => {
    if (!input.value.trim()) {
      valid = false;
    }
  });

  if (!valid) {
    alert("Please fill in all delivery details.");
    return;
  }

  // Save to localStorage (optional)
  const deliveryData = {
    name: inputs[0].value,
    email: inputs[1].value,
    address: inputs[2].value,
    phone: inputs[3].value
  };

  localStorage.setItem("deliveryDetails", JSON.stringify(deliveryData));

  // Redirect to payment page
  window.location.href = "payment.html";
});
