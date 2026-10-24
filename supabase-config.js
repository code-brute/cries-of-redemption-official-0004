/**
 * Supabase connection settings for Cries Of Redemption.
 *
 * - url:     Project URL only, e.g. https://xxxx.supabase.co  (a trailing /rest/v1/ is tolerated)
 * - anonKey: the "anon public" key (safe to publish; writes are blocked by Row Level Security)
 * - enabled: KILL SWITCH. Set to false and the public site uses the local JSON files only.
 *
 * If this file is missing, blank, wrong, or Supabase is down/paused, the site
 * automatically uses band-data.json, videos-data.json, press-data.json and blog-data.json.
 */
window.SUPABASE_CONFIG = {
  enabled: true,
  url: 'https://tshrvkvdwbymztsulvrw.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzaHJ2a3Zkd2J5bXp0c3VsdnJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NTUxMDMsImV4cCI6MjEwODQzMTEwM30.Quqf1BRzMEdiRNkC9edCg_jq0lr2itlG3j9hMyzaeMg'
};

