// ============================================
// SmartWasteAI Authentication Helper Functions
// ============================================

async function getAccessToken() {
    const {
        data: { session },
        error
    } = await supabaseClient.auth.getSession();

    if (error) {
        console.error("Session error:", error);
        return null;
    }

    return session?.access_token || null;
}


async function requireAuthentication() {
    const {
        data: { session },
        error
    } = await supabaseClient.auth.getSession();

    if (error) {
        console.error("Authentication error:", error);
        return null;
    }

    if (!session) {
        window.location.replace("login.html");
        return null;
    }

    return session;
}


async function logoutUser() {
    const { error } =
        await supabaseClient.auth.signOut();

    if (error) {
        throw error;
    }

    window.location.replace("login.html");
}