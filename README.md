This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# User Role Management

## Overview
User roles (Admin, Approved Students, Staff) are now managed in Firestore instead of environment variables for better security. This prevents sensitive email addresses from being exposed in client-side code.

## Setup Instructions

1. Create a service account key in Firebase console:
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save the downloaded file as `serviceAccountKey.json` in the project root

2. Add your first admin user using the bootstrap script:
   ```
   node scripts/bootstrap-admin.js your-admin-email@example.com
   ```

3. Log in with the admin email you added to access the Admin dashboard.

4. Use the Admin dashboard to manage other user roles:
   - Add/remove admin users
   - Add/remove approved students
   - Add/remove staff members

## Security Notes
- User roles are now stored in the `userEmails` collection in Firestore
- No sensitive data is exposed in environment variables
- Role checks happen on both client and server sides for complete security
