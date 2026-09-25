/* Reader feedback (comments, 👍/👎, view counts) — Supabase connection.
   Leave supabaseUrl empty to keep the feature switched off site-wide.
   Both values are PUBLIC by design (Supabase "Project URL" and the
   "anon"/"publishable" key); all rules are enforced in the database.
   Setup: supabase/README.md */
window.OTS_FEEDBACK_CONFIG = {
  supabaseUrl:     '',
  supabaseAnonKey: '',
  /* Sign-in buttons, in order. Supabase provider ids:
     'google', 'azure' (Microsoft), 'linkedin_oidc' (LinkedIn). */
  providers: ['google', 'azure'],
};
