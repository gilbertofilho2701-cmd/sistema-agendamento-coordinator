/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://naoqyfuvfqwdckbjemvw.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hb3F5ZnV2ZnF3ZGNrYmplbXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNTI3NTQsImV4cCI6MjEwNjkyODc1NH0.NmjgjwwJw9kU3wg4L0zecCw3Xi9E1p9YMPZpabOSLjo'
  }
}

module.exports = nextConfig