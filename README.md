# Traveler Trust Compass

I have an existing full-stack project called ST & ID — Smart Travel & Identity.

 Improve the design of this website and make it fully functioning 

I want you to audit and improve the existing application, not rebuild it from scratch.



First, inspect the entire codebase, database migrations, authentication, and backend functions.



Prioritize these tasks:



1. Fix critical security problems, especially role escalation and unauthorized access to traveler passport information.

2. Fix Google OAuth authentication and explain any external configuration required.

3. Make passport OCR work with the existing Google Cloud Vision integration.

4. Improve QR scanning compatibility across mobile browsers.

5. Check all three dashboards: Traveler, Business, and Admin.

6. Fix broken buttons, forms, database operations, and navigation.

7. Improve the visual consistency and overall user experience without replacing the existing design.



Important rules:



- Preserve the current architecture and existing features.

- Do not delete existing database tables or migrations.

- Do not replace the backend or create a new database.

- Do not expose API keys or sensitive information.

- Do not claim a feature works unless it has been tested.

- Do not make destructive database changes.

- Keep me informed about required external API keys and configuration.



Start with a detailed audit and identify the critical problems. Then fix them in priority order, testing each important workflow.



I am not a programmer, so explain technical requirements in simple language.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://traveler-trust-compass.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d0906029-ee5f-4ba3-a00a-0049e77b78c0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
