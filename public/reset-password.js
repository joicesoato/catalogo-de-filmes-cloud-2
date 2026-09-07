const token = new URLSearchParams(window.location.search).get("token");
const form = document.getElementById("reset-form");
const password = document.getElementById("new-password");
const feedback = document.getElementById("reset-feedback");
const submit = document.getElementById("reset-submit");

function showFeedback(message, type) {
  feedback.textContent = message;
  feedback.className = `feedback ${type}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!token) {
    showFeedback("Este link de redefinição é inválido.", "error");
    return;
  }

  if (password.value.length < 6) {
    showFeedback("A senha precisa ter pelo menos 6 caracteres.", "error");
    password.focus();
    return;
  }

  submit.disabled = true;
  submit.textContent = "Redefinindo...";
  showFeedback("Validando seu pedido...", "loading");

  try {
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, novaSenha: password.value })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.erro || "Não foi possível redefinir a senha.");
    }

    form.reset();
    showFeedback(data.mensagem, "success");
  } catch (error) {
    showFeedback(error.message, "error");
  } finally {
    submit.disabled = false;
    submit.textContent = "Redefinir senha";
  }
});
