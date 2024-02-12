declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SENDINBLUE_API_KEY: string;
      SERVICE_ACCOUNT_PROJECT_ID: string;
      SERVICE_ACCOUNT_CLIENT_EMAIL: string;
      SERVICE_ACCOUNT_PRIVATE_KEY: string;
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
