// Load .env (then .env.local) into process.env without overriding real environment variables.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // Missing file is fine.
  }
}
