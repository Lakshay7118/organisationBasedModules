This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

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

## WebRTC Calls

Voice calls fetch ICE servers from the backend at `/api/rtc/ice-servers`. Keep these values in the backend deployment environment:

```bash
STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302,stun:stun2.l.google.com:19302,stun:stun.cloudflare.com:3478
```

The frontend `.env.local` STUN value is only a fallback if the backend ICE endpoint is unavailable:

```bash
NEXT_PUBLIC_STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302,stun:stun2.l.google.com:19302,stun:stun.cloudflare.com:3478
```

For calls outside the same LAN, both browsers must also be able to reach the signaling server in `NEXT_PUBLIC_SOCKET_URL`. On production this must be your public HTTPS backend URL, not a private `192.168.x.x` address.

STUN handles public candidate discovery, but some networks still require a TURN relay. For production reliability, run coturn and set:

```bash
TURN_URLS=turn:your-turn-host:3478,turns:your-turn-host:5349
TURN_SECRET=your-coturn-static-auth-secret
TURN_TTL_SECONDS=3600
```

If you do not use coturn REST credentials, static credentials also work:

```bash
TURN_USERNAME=your-user
TURN_CREDENTIAL=your-password
```

Restart the backend after changing backend ICE variables. Restart the Next.js dev server after changing any `NEXT_PUBLIC_*` fallback variable.

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
