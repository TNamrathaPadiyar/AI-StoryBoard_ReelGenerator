# Frontend Notes in Simple English

## What this folder is

This `frontend` folder is the visual part of the project.

It is the part the user sees in the browser:
- the home page
- the sign up page
- the sign in page
- the dashboard after login

In simple words, this folder is the "website/app screen side" of the project.
It does not do the heavy video processing by itself.
Instead, it sends requests to the backend server, waits for results, and shows those results to the user.

## What this app appears to do

This frontend is for a product called **CinePulse Studio**.

Its purpose is:
- let a user create an account
- let the user log in
- let the user upload a long video
- send that video to the backend for processing
- show processing progress
- show the final short reel, thumbnail, captions, hashtags, transcript, and content insights

So the frontend is mainly a **control panel and display layer** for an AI video-short generation system.

## Big picture: how it works

Here is the full journey in very simple language:

1. A user opens the website.
2. The home page explains the product.
3. The user can register or log in.
4. After login, the user enters the dashboard.
5. In the dashboard, the user uploads a video file.
6. The frontend sends the file and settings to the backend server.
7. The backend processes the video in the background.
8. The frontend keeps checking for updates every few seconds.
9. When processing is done, the dashboard shows the final reel and related content.

## Main folders and files

### `src/`

This is the most important folder.
It contains the actual app code.

### `src/App.js`

This is the main traffic controller of the frontend.

It decides which page opens for which website path:
- `/` -> Home page
- `/login` -> Login page
- `/register` -> Register page
- `/dashboard` -> Dashboard page

It also wraps the whole app with login/session support.

### `src/index.js`

This is the startup point.
It loads the React app into the browser page.

### `src/api.js`

This file is very important.
It is the bridge between the frontend and backend.

It handles:
- user registration
- user login
- video upload
- listing uploaded videos
- getting details of a single video
- checking backend health
- building usable file URLs for videos/images

Important behavior:
- if `REACT_APP_API_BASE_URL` exists, it uses that backend address
- otherwise it tries `http://<current-host>:8000`

That means the frontend expects the backend to usually run on port `8000`.

### `src/context/`

This folder stores shared app state.

#### `src/context/AuthContext.js`

This file manages login information.

In non-technical terms, it:
- remembers who is logged in
- stores that login session in the browser
- allows register
- allows login
- allows logout

It uses browser storage with the key:
- `cinepulse_session`

That means if the browser is refreshed, the app tries to remember the logged-in user.

### `src/pages/`

This folder contains the main screens of the app.

#### `HomePage.js`

This is the marketing/welcome page.

Its job is to explain:
- what the product does
- what features it offers
- what the user gets out of it

It uses animated cards and a strong visual design to make the product feel premium.

#### `LoginPage.js`

This is the sign-in screen.

It:
- collects email and password
- sends login details through the auth system
- shows errors if login fails
- sends the user to the dashboard after success

#### `RegisterPage.js`

This is the account-creation screen.

It:
- collects full name, email, password, and confirm password
- checks that password is long enough
- checks that both passwords match
- creates the account
- sends the user to the dashboard after success

#### `DashboardPage.js`

This is the heart of the app.

This page does most of the actual user work.

It allows the user to:
- upload a source video
- choose reel length
- choose target platform
- choose language
- choose whether subtitles should be added
- see system health
- view upload history
- track processing status
- preview the final reel
- open the generated thumbnail
- copy caption suggestions
- copy hashtags
- read transcript and creative insights

This page also keeps checking unfinished videos every 6 seconds so the screen updates automatically while processing is happening.

#### `LandingDemo.js` and `DashboardDemo.js`

These look like older demo or experimental pages.

Important note:
- they are inside the codebase
- but they are **not connected to the main app routing in `App.js`**

So they appear to be prototype/demo files, not part of the current live app flow.

### `src/components/`

This folder contains reusable building blocks.

#### Important components

`TopNav.js`
- top navigation bar
- shows brand name and buttons like Home, Sign In, Register, Log Out

`ProtectedRoute.js`
- protects private pages
- if user is not logged in, sends them to the login page

`SceneBackground.js`
- creates the animated background look

`PageTransition.js`
- adds page opening/closing animations

`BrandMark.js`
- shows the logo symbol

`FeatureIcons.js`
- holds icon graphics used in cards and sections

#### Less important / likely optional components

`ParticlesBG.js`
- creates a particle animation background
- tied to demo-style pages, not the current main route flow

`CreatorVisual.js`
- exists in the folder, but from the current app scan it does not appear to be part of the active route flow

### `src/styles/`

This folder contains visual styling.

#### `theme.css`

This is the main design file.

It controls things like:
- colors
- spacing
- buttons
- cards
- background effects
- dashboard layout
- animations

The current visual style is:
- dark background
- glowing gradients
- glass-like cards
- animated modern UI

### `src/assets/`

This stores media files used by the frontend.

Current visible asset:
- `anime_girl.png`

This appears to be an image asset, but from the current scan it does not look central to the main active app flow.

### `public/`

This contains browser-level public files.

Important files:
- `index.html` -> the base HTML shell loaded by the browser
- `favicon.ico` -> browser tab icon
- `manifest.json` -> install/app metadata
- `robots.txt` -> search engine crawling instructions

## Other top-level folders

### `node_modules/`

This contains downloaded packages/libraries the app depends on.

This is a support folder, not something people normally edit by hand.

### `build/`

This is the production-ready output folder.

In simple words:
- `src` is the editable source
- `build` is the packed final website version for deployment

### `build-temp`, `build-temp-2`, `build-temp-3`, ... `build-temp-13`

These look like temporary or backup build output folders created during earlier work.

They do not look like the main source code.
They are likely generated folders, test builds, or staging copies.

Important note:
- they may be useful as backups
- but they are not the main place to edit the app

### `.git/`

This is Git version-control data.
It tracks project history.

### `.gitignore`

This tells Git which files/folders should not be tracked.

### `package.json`

This is the app's package/control file.

It lists:
- project name
- packages used
- commands like start, build, and test

### `package-lock.json`

This locks exact package versions so installs stay consistent.

### `README.md`

This is still the default Create React App starter README.
It has generic setup instructions, not project-specific notes.

## Main tools and packages used

Below is a simple explanation of the important packages found in `package.json`.

### Core app packages

`react`
- the main library used to build the frontend UI

`react-dom`
- connects React to the browser page

`react-scripts`
- the build/start/test system from Create React App
- helps run the project locally and build it for production

### Navigation

`react-router-dom`
- handles page navigation without full page reload
- example: moving between Home, Login, Register, Dashboard

### Animation and look

`framer-motion`
- used for page transitions, moving cards, animated sections, and polished visual effects

`react-icons`
- icon package for UI symbols

`react-tsparticles`
`tsparticles`
- used for particle background effects
- from the current scan, these seem connected mainly to older/demo pages rather than the main live route flow

### Testing

`@testing-library/react`
`@testing-library/dom`
`@testing-library/jest-dom`
`@testing-library/user-event`
- tools used for frontend testing
- they help simulate user behavior and verify the UI works correctly

### Performance

`web-vitals`
- used for measuring performance-related browser metrics

## Commands used in this frontend

These are the main project commands from `package.json`:

`npm start`
- runs the app locally for development

`npm run build`
- creates a production-ready version inside `build/`

`npm test`
- runs tests

`npm run eject`
- exposes advanced internal configuration
- usually avoided unless absolutely necessary

## What the frontend depends on from the backend

This frontend is not fully independent.
It depends on a backend server being available.

Main backend expectations:
- register endpoint
- login endpoint
- video upload endpoint
- video listing endpoint
- single video detail endpoint
- health check endpoint
- media files accessible by URL

Important backend paths used:
- `/api/auth/register`
- `/api/auth/login`
- `/api/videos/upload`
- `/api/videos`
- `/api/videos/:id`
- `/api/health`

If the backend is not running, the frontend will show errors like:
- cannot reach backend server
- request failed
- upload failed

## Simple explanation of the dashboard data flow

When a user uploads a video, this frontend sends:
- the video file
- the user ID
- clip length
- subtitle on/off
- selected platform
- target language

The dashboard then expects the backend to return data such as:
- upload status
- transcript
- highlights
- clips
- thumbnail
- caption suggestions
- hashtags
- viral score
- creative insights

So the frontend is acting like a **smart display dashboard** for the backend's video-processing results.

## Security/login behavior in plain English

The dashboard is protected.

That means:
- if someone is not logged in, they should not directly access `/dashboard`
- the app sends them to `/login` first

The login session is stored in the browser using local storage.

This is convenient for keeping the user signed in after refresh, but it also means authentication is being remembered on the browser side.

## Important practical notes

### Main files a developer would most likely work in

If someone wants to change the real app behavior, the most important files are:
- `src/App.js`
- `src/api.js`
- `src/context/AuthContext.js`
- `src/pages/HomePage.js`
- `src/pages/LoginPage.js`
- `src/pages/RegisterPage.js`
- `src/pages/DashboardPage.js`
- `src/styles/theme.css`

### Files/folders that look less central

These appear less central to the current active app flow:
- `src/pages/LandingDemo.js`
- `src/pages/DashboardDemo.js`
- `src/components/ParticlesBG.js`
- `src/components/CreatorVisual.js`
- `src/assets/anime_girl.png`
- `build-temp*` folders

That does not mean they are useless.
It just means they do not appear to be part of the current main user flow based on the present route setup.

## Strengths of this frontend

In simple terms, the good points are:
- clear user journey from homepage to dashboard
- modern visual design
- dashboard is focused on one clear workflow
- handles upload, status tracking, and results in one place
- supports multiple useful output types beyond just the video

## Things worth noticing

These are not necessarily problems, but they are important:

- The project still has the default Create React App README instead of project-specific documentation.
- `public/index.html` still has a generic title (`React App`) and generic description text.
- There are older demo/prototype files still present in `src`.
- There are many `build-temp` folders, which may create clutter.
- The frontend relies heavily on the backend being available and returning the expected data shape.

## One-sentence summary

This `frontend` folder is a React-based web app for an AI video-short generator, where the frontend handles the user experience, account flow, upload dashboard, and result display, while the backend does the actual video processing work.
