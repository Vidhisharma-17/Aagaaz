const SUPABASE_URL = "https://vgryidyfvrifuivifnnu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_WrubSfM6Be4EzblSo51MJg_RJsKkn7_";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

window.supabaseClient = supabaseClient;