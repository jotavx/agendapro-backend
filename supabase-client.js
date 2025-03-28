// supabaseClient.js
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL; // URL de tu proyecto Supabase
const supabaseKey = process.env.SUPABASE_KEY; // Clave de servicio

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
