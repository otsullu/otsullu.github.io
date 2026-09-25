/* Reader feedback (comments, 👍/👎, view counts) — Supabase connection.
   Leave supabaseUrl empty to keep the feature switched off site-wide.
   Both values are PUBLIC by design (Supabase "Project URL" and the
   "anon"/"publishable" key); all rules are enforced in the database.
   Setup: supabase/README.md */
window.OTS_FEEDBACK_CONFIG = {
  supabaseUrl:     'https://aekwswatvurwznuhdyey.supabase.co',
  supabaseAnonKey: 'sb_publishable_5G04Z6vbJA4wQBzrgSF7hw_xImOzrc3',
  /* Sign-in buttons, in order. Supabase provider ids:
     'google', 'azure' (Microsoft), 'linkedin_oidc' (LinkedIn). */
  providers: ['google'],
};
