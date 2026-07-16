let activeSession = null;


function setNavbarUser(session) {

    const user = session?.user;


    if (!user) {
        return;
    }


    const fullName =
        user.user_metadata?.full_name ||
        "EcoVisionAI User";


    document.getElementById(
        "navbarUserName"
    ).textContent =
        fullName;


    document.getElementById(
        "navbarUserEmail"
    ).textContent =
        user.email || "";
}


async function initializeInfoPage() {

    try {

        activeSession =
            await requireAuthentication();


        if (!activeSession) {
            return;
        }


        setNavbarUser(activeSession);


    } catch (error) {

        console.error(
            "Info page initialization error:",
            error
        );
    }
}


document.getElementById(
    "logoutButton"
).addEventListener(
    "click",
    async () => {

        try {

            await logoutUser();

        } catch (error) {

            console.error(
                "Logout failed:",
                error
            );
        }
    }
);


initializeInfoPage();