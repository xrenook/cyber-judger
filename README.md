# ⚖️ Cyber Judger

A React-based web application where users can share cases and judge others' cases anonymously. Built with Firebase for authentication and data storage.

## 🚀 Features

### **User Authentication**
- Email/password registration and login
- Google OAuth authentication
- User profiles with statistics
- Secure Firebase authentication

### **Case Management**
- **Penitents**: Share cases (1 per day maximum)
- **Judges**: Vote on cases (10 per day maximum)
- Anonymous posting option
- Manual verification system for cases and comments

### **Dynamic Background Colors**
- **Gray**: Default state (no votes)
- **Black**: More guilty votes (>60%)
- **White**: More innocent votes (<40%)

### **Content Limits**
- Cases: Maximum 500 characters
- Comments: Maximum 200 characters
- Daily limits enforced

### **Popularity System**
- Cases sorted by popularity (most voted first)
- Real-time vote counting
- Community-driven verdicts

## 🛠️ Technology Stack

- **Frontend**: React 18, React Router DOM
- **Backend**: Firebase (Authentication, Firestore)
- **Styling**: CSS3 with modern features
- **Notifications**: React Hot Toast
- **Date Handling**: Date-fns

## 📋 Prerequisites

- Node.js (version 14 or higher)
- npm or yarn
- Firebase project with Authentication and Firestore enabled

## 🔧 Setup Instructions

### 1. Clone and Install
```bash
cd cyber-judger
npm install
```

### 2. Firebase Configuration
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication:
  - Email/Password provider
  - Google provider (for OAuth)
3. Create a Firestore database
4. Provide your Firebase config to the app using environment variables.

Steps:

1. Copy the example local env file at the repo root:

```bash
cp .env.local.example .env.local
```

2. Open the new `.env.local` and fill the `REACT_APP_FIREBASE_*` values with your Firebase project settings. Do NOT commit `.env.local` — it is ignored by `.gitignore`.

3. This project reads the following variables at runtime:

```
REACT_APP_FIREBASE_API_KEY
REACT_APP_FIREBASE_AUTH_DOMAIN
REACT_APP_FIREBASE_PROJECT_ID
REACT_APP_FIREBASE_STORAGE_BUCKET
REACT_APP_FIREBASE_MESSAGING_SENDER_ID
REACT_APP_FIREBASE_APP_ID
REACT_APP_FIREBASE_MEASUREMENT_ID
```

If you prefer not to use environment variables, `src/firebase/config.js` will fall back to bundled values for local development.

### 3. Firestore Security Rules
Set up these security rules in your Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Anyone can read verified cases
    match /cases/{caseId} {
      allow read: if resource.data.isVerified == true;
      allow create: if request.auth != null;
      allow update: if false; // Only admin can update
    }
    
    // Anyone can read verified comments
    match /comments/{commentId} {
      allow read: if resource.data.isVerified == true;
      allow create: if request.auth != null;
      allow update: if false; // Only admin can update
    }
    
    // Users can create votes
    match /votes/{voteId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Start Development Server
```bash
npm start
```

The app will run on `http://localhost:4000`

## 📊 Database Structure

### Collections

#### `users`
```javascript
{
  uid: string,
  email: string,
  displayName: string,
  createdAt: timestamp,
  casesPosted: number,
  casesJudged: number,
  lastCaseDate: timestamp,
  lastJudgedDate: timestamp,
  dailyCasesPosted: number,
  dailyCasesJudged: number
}
```

#### `cases`
```javascript
{
  title: string,
  description: string,
  authorId: string,
  authorName: string,
  isAnonymous: boolean,
  createdAt: timestamp,
  isVerified: boolean,
  guiltyCount: number,
  innocentCount: number,
  popularity: number,
  totalVotes: number
}
```

#### `votes`
```javascript
{
  caseId: string,
  userId: string,
  userName: string,
  verdict: "guilty" | "innocent",
  createdAt: timestamp
}
```

#### `comments`
```javascript
{
  caseId: string,
  userId: string,
  userName: string,
  text: string,
  createdAt: timestamp,
  isVerified: boolean
}
```

## 🔐 Admin Functions

### Manual Verification
Cases and comments require manual verification in Firebase Console:
1. Go to Firestore Database
2. Find unverified cases/comments (`isVerified: false`)
3. Update `isVerified` to `true` to publish

### Daily Limit Reset
User daily limits are automatically reset when they log in on a new day.

## 🎨 UI Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern UI**: Clean, professional interface with smooth animations
- **Color-coded Cases**: Dynamic backgrounds based on community verdicts
- **Real-time Updates**: Live vote counting and statistics
- **User-friendly**: Intuitive navigation and clear feedback

## 📱 User Flow

### For Non-logged Users
1. Browse verified cases
2. View case details and comments
3. Must register/login to participate

### For Logged Users
1. **Share Cases**: Create new cases (1 per day)
2. **Judge Cases**: Vote guilty/innocent (10 per day)
3. **Comment**: Add comments to cases
4. **Profile**: View statistics and activity history

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## 🔧 Customization

### Daily Limits
Modify limits in:
- `src/contexts/AuthContext.js` (user stats)
- `src/pages/CreateCase.js` (case posting)
- `src/pages/CaseDetail.js` (case judging)

### Character Limits
Update limits in:
- `src/pages/CreateCase.js` (case description)
- `src/pages/CaseDetail.js` (comments)

### Background Colors
Modify color logic in:
- `src/pages/Home.js` (case cards)
- `src/pages/CaseDetail.js` (case detail)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the Firebase Console for configuration
2. Verify Firestore security rules
3. Check browser console for errors
4. Ensure all dependencies are installed

---

**Cyber Judger** - Where the community decides justice! ⚖️ 