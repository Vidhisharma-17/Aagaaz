document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.getElementById("loginForm");
    const loginButton = document.getElementById("loginButton");
    const authMessage = document.getElementById("authMessage");
    const passwordInput = document.getElementById("password");
    const passwordToggle = document.querySelector(
        '[data-password-target="password"]'
    );

    // ==========================================
    // SHOW / HIDE PASSWORD
    // ==========================================

    if (passwordToggle && passwordInput) {

        passwordToggle.addEventListener("click", () => {

            const isPassword =
                passwordInput.type === "password";

            passwordInput.type =
                isPassword ? "text" : "password";

            passwordToggle.textContent =
                isPassword ? "Hide" : "Show";
        });
    }


    // ==========================================
    // CHECK LOGIN FORM
    // ==========================================

    if (!loginForm) {
        console.error("Login form not found.");
        return;
    }


    // ==========================================
    // LOGIN
    // ==========================================

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;


        if (!email || !password) {

            authMessage.textContent =
                "Please enter your email and password.";

            return;
        }


        loginButton.disabled = true;
        loginButton.textContent = "Logging in...";

        authMessage.textContent = "Logging in...";


        try {

            console.log("Starting login...");


            if (typeof supabaseClient === "undefined") {

                throw new Error(
                    "Supabase client is not loaded."
                );
            }


            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });


            console.log(
                "Supabase login response:",
                data,
                error
            );


            if (error) {
                throw error;
            }


            if (!data?.session) {

                throw new Error(
                    "No login session was created."
                );
            }


            authMessage.textContent =
                "Login successful! Redirecting...";


            setTimeout(() => {

                window.location.href =
                    "new-prediction.html";

            }, 800);


        } catch (error) {

            console.error(
                "LOGIN FAILED:",
                error
            );


            authMessage.textContent =
                error.message ||
                "Login failed.";

        } finally {

            loginButton.disabled = false;

            loginButton.textContent =
                "Login";
        }

    });


    console.log(
        "Login page JavaScript loaded successfully."
    );

});