const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fullName =
        document.getElementById("fullName").value.trim();

    const email =
        document.getElementById("registerEmail").value.trim();

    const password =
        document.getElementById("registerPassword").value;

    registerMessage.textContent = "Creating account...";

    const { data, error } =
        await window.supabaseClient.auth.signUp({
            email,
            password,

            options: {
                data: {
                    full_name: fullName
                }
            }
        });

    if (error) {
        console.error("REGISTER ERROR:", error);
        registerMessage.textContent = error.message;
        return;
    }

    console.log("REGISTER SUCCESS:", data);

    if (data.session) {
        registerMessage.textContent =
            "Account created successfully.";

        window.location.href = "new-prediction.html";
        return;
    }

    registerMessage.textContent =
        "Account created. Please verify your email, then login.";
});