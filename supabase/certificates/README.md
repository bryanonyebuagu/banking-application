# Supabase database CA

prod-ca-2021.crt was downloaded over HTTPS from the certificate link shown in this project's Supabase Database Settings on 2026-09-28:
https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

This is a public CA certificate, not a secret. Hosted tooling uses it with rejectUnauthorized enabled, including hostname verification. It does not change system-wide trust. The client verifies the laptop-to-session-pooler connection. pg_stat_ssl describes the separate pooler-to-database connection and must not be presented as proof of the laptop TLS state.
