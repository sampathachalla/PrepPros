# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   cd mobile
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

### Use a phone from any network

From the mobile directory, start the API tunnel and Expo Go tunnel together:

```bash
cd /Users/sampath/Desktop/PrepPros/mobile
npm run tunnel
```

Keep that process running while testing. It prints the public HTTPS API URL and
the Expo QR code. For a custom development build, use `npm run tunnel:dev-client`
instead. The public URLs change whenever the process is restarted.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing files inside the **mobile/app** directory.
This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Backend services

The Docker stack includes the Node.js API, PostgreSQL database, and a separate
Nous Hermes-compatible research agent. Copy `.env.example` to `.env`, ensure the
configured model endpoint is available, then start everything with:

```bash
docker compose up --build -d
docker compose ps
```

The database, API, and agent are three separate build targets in the single
root `Dockerfile`. The root Compose file builds and runs all three containers.

The API is available on port `8000`, the agent on `8001`, and PostgreSQL on
`5432`. The database schema is initialized from `db/init.sql` when its persistent
volume is first created.

## Importing recipe links

`POST /bookmarks/import` saves an Instagram or YouTube link straight away and reads it in the background, because Bright Data takes about a minute per Instagram post. The app polls until the bookmark is filled in.

- **Queue:** `scrape_jobs` in Postgres, one job per post, so it survives restarts and two users saving one reel pay for one scrape. Failed reads retry 5 times with backoff, and reel retries alternate with Bright Data's posts scraper.
- **Postgres:** `shared_links` holds who shared what; `social_posts` holds the extracted content for both platforms.
- **Backup:** with `SUPABASE_SECRET_KEY` set, new JSONL files are written every minute to the private `preppros-backups` Storage bucket: `links/` (Instagram and YouTube links with user ids) and `instagram/` (Bright Data's records). YouTube content is not backed up. Files are never changed, so to restore, keep the line with the newest `updated_at` for each `id`.
- **`TEMP_USER_ID`:** temporary owner of bookmark requests that have no access token. A real token always wins. Remove it before real users can reach the API.

## Households, the calendar and meal prep

Accounts are real Supabase logins made with an email and password; there are no usernames. Turn off **Confirm email** in Supabase (Authentication → Sign In / Providers → Email) to sign people in right after signup; with it on, they confirm by email first. Each account's details are kept in the `users` table of the local Postgres, under the same id as its Supabase account: email, role, display name, avatar colour, sign-in method, when the email was confirmed and the last login. Passwords stay in Supabase only. A person belongs to one household of up to 6 people. Whoever creates it is the admin; the admin can add anyone with an account by their email, and others can join with its invite link or code.

1. **Plan:** the admin adds dishes to each meal. The day stays a draft only they can see.
2. **Timer:** the admin starts a timer for a day or the rest of the week. Everyone can now see it.
3. **Answer:** while it runs, each person chooses one dish per meal or suggests their own. The admin approves or declines suggestions.
4. **Fixed:** when the timer ends (or the admin ends it early) the day is final. Undecided suggestions are declined, and anyone who didn't answer gets that meal's most chosen dish so the cook still counts them. The admin can reopen a day.
5. **Meal prep:** fixed days become the week's cooking list, with a serving per person, and a shared shopping list.

Days fix themselves on the next read after the timer ends, so no background job is needed. Every rule is enforced by the API in `api/src/modules/calendar`; the app only decides what to show. Invite links use the `preppros://` scheme, which needs a development or store build; in Expo Go, paste the invite code instead.
