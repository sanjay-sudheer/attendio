## Attendio

Smart IoT-powered fingerprint attendance system built with Next.js, ESP32 + R307 sensor integration, and Firebase.

---

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

### Environment Variables

Create a `.env.local` file in the project root with the following (public) Firebase web config values:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id # optional
NEXT_PUBLIC_ADMIN_EMAILS=admin1@example.com,admin2@example.com # optional allowlist
```

If `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` is omitted, analytics will simply not initialize (no runtime errors).

### Firebase Initialization

The file `lib/firebase.js` safely initializes Firebase only once (handles Next.js Fast Refresh) and lazily loads Analytics only in supported browsers. It also exports `auth` and `db` singletons.

```js
import { app } from '@/lib/firebase';
```

Example (Firestore):
### Admin Authentication

The admin login page (`/admin-login`) uses Firebase Email/Password auth and then checks a Firestore document at `users/{uid}` for `role: "admin"`.

Optional: Provide a comma-separated `NEXT_PUBLIC_ADMIN_EMAILS` to additionally restrict which emails can log in even if their Firestore role is `admin`.

Required Firestore document shape:

```
users/{uid} => { role: "admin" }
```

If the document is missing or role is not `admin`, login will be rejected.

```js
import { getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase';

const db = getFirestore(app);
```

### Scripts

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
