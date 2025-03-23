# Habit Tracker

A simple habit tracking application built with Vite, React, TypeScript, Tailwind CSS, and Firebase.

## Features

- Create, read, update, and delete habits
- Track habit completion and streaks
- Filter habits by frequency (daily, weekly, monthly)
- Responsive design with Tailwind CSS
- Data persistence with Firebase Firestore

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account

## Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd habit-tracker
```

2. Install dependencies:

```bash
npm install
```

3. Create a Firebase project:

   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Set up Firestore database
   - Register a web app in your Firebase project

4. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your Firebase configuration values

```bash
cp .env.example .env
```

5. Start the development server:

```bash
npm run dev
```

6. Open your browser and navigate to `http://localhost:5173`

## Build for Production

```bash
npm run build
```

## Technologies Used

- [Vite](https://vitejs.dev/)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Firebase](https://firebase.google.com/)

## License

MIT

## Firebase Storage Configuration

This application uses Firebase Storage to store user profile images. Follow these steps to set up Firebase Storage in your project:

1. **Deploy Storage Rules**:

   ```bash
   firebase deploy --only storage
   ```

2. **Configure CORS** (if needed):

   - Create a `cors.json` file with the following content:
     ```json
     [
       {
         "origin": ["*"],
         "method": ["GET"],
         "maxAgeSeconds": 3600
       }
     ]
     ```
   - Deploy CORS configuration:
     ```bash
     gsutil cors set cors.json gs://YOUR-BUCKET-NAME.appspot.com
     ```

3. **Storage Usage Limits**:
   - The free tier includes 5GB of storage and 1GB/day of download bandwidth
   - Consider implementing additional client-side validation to limit file sizes

## Profile Image Features

- Image compression is automatically applied to reduce storage usage and improve upload speed
- Users can toggle image compression on/off
- Maximum image size: 5MB
- Supported formats: JPG, PNG, GIF
- Automatic image resizing to max 1200px width/height
