# OVERVIEW

TripAdvisor AI is a full-stack AI-powered travel planning web application that helps users generate smart travel itineraries, explore destinations, discover attractions, check weather updates, and interact with an AI travel assistant. The application combines AI-powered itinerary generation, FastAPI + Python backend services, and a modern React + Vite frontend — deployed using Netlify or Vercel (Frontend) and Render (Backend).


# DEPLOYMENT LINK

Frontend Deployment (Netlify): https://tripwithbinod.netlify.app

Frontend Deployment (Vercel): https://tripwithbinod.vercel.app

Backend Deployment (Render): https://tripadvisor-binodkapadi.onrender.com


# PROJECT SETUP

npm = Node Package Manager

npx = Node Package Executer


## Step 1: Install Required Software

### A) Install Node.js

Download and install Node.js: 

official website: https://nodejs.org/en/download/

Verify installation [Open Command Prompt in Windows]:

    node -v
    npm -v


### B) Install Python

Download and install Python:

official website: https://www.python.org/downloads/

Verify installation [Open Command Prompt in Windows]:

    python --version


## Step 2: Setup Folder Structure

Open VS Code Terminal and create a new folder:

    mkdir TripAdvisor
    cd TripAdvisor


### A) Backend Setup (FastAPI + Python) [Use Same Terminal]

    mkdir backend
    cd backend
    python -m venv venv
    venv\Scripts\activate

First of all, inside the backend folder create:

* requirements.txt
* .env


#### Install Dependencies

First put all required dependencies inside requirements.txt file and then run:

    pip install -r requirements.txt


#### Configure Environment Variables (.env)

    MONGODB_URI=your_mongodb_uri
    MONGODB_DBNAME=your_database_name

    SERPAPI_KEY=your_serpapi_key

    OPENWEATHER_API_KEY=your_openweather_api_key

    GEMINI_API_KEY=your_gemini_api_key

    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret

    GITHUB_CLIENT_ID=your_github_client_id
    GITHUB_CLIENT_SECRET=your_github_client_secret

    LINKEDIN_CLIENT_ID=your_linkedin_client_id
    LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

    # For Local Environment

    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=your_email@gmail.com
    SMTP_PASSWORD=your_app_password
    EMAIL_FROM=your_email@gmail.com
    NOTIFY_EMAIL=your_email@gmail.com

    #For Production Only
    # Brevo Email API Config (Required/Recommended for Render Free Tier to bypass SMTP port blocking)

    # BREVO_API_KEY=your_brevo_api_key_here
    # ENVIRONMENT=production
    # SENDER_EMAIL=your_email@gmail.com
    # SENDER_NAME = TripAdvisor

### B) Frontend Setup (React + Vite) [Open New Terminal]

    npm create vite@latest
    
    ◇  Project name:
    │  frontend
    │
    ◇  Select a framework:
    │  React
    │
    ◇  Select a variant:
    │  JavaScript
    │
    ◇  Use ESLint instead of Oxlint?
    │  No (Oxlint)
    │
    ◇  Install with npm and start now?
    │  Yes
    │
    
Install dependencies:

    npm install
    npm install axios react-router-dom

### Create `.env` file inside frontend folder.


#### Frontend .env Configuration

    VITE_API_URL=http://127.0.0.1:8000

    # VITE_API_URL=Your_Production_URL (Production URL if you want run locally leave as it is it will not effect your code.)


## Step 3: RUN PROJECT LOCALLY

Run Backend and Frontend in separate terminals.

Backend

    cd backend
    venv\Scripts\activate
    uvicorn app.main:app --reload

If you do not create an `app` folder and your `main.py` file is directly inside backend folder, then run:

    uvicorn main:app --reload

Frontend

    cd frontend
    npm run dev

# Leave  [Step 4] if you are running project in Local Host only.

## Step 4: MUST NEED TO DO [fOR PRODUCTION LEVEL OR HOSTING]

### Inside Backend->app->api Folder[routes.py] [if you are running In production level or hosting]then
Replace the portion of code from this file routes.py[line 34-41]

    def get_base_url() -> str:
        if settings.is_production:
            return "Your_Backend_Production_Url"
        return settings.BASE_URL


    def get_default_frontend_url() -> str:
        return "Your_Frontend_Production_URL"


# FEATURES

* AI-powered itinerary generation
* Smart destination recommendations
* Weather forecasting integration
* Nearby attractions and places suggestions
* AI travel assistant chatbot
* User authentication (Google, GitHub, LinkedIn)
* OTP email verification system
* Shareable travel plans
* Responsive modern UI
* FastAPI REST APIs
* MongoDB database integration
* Email notifications and itinerary sending
* Personalized AI trip recommendations based on user preferences and budget

# TECHNOLOGIES USED

### Frontend

* React + Vite
* HTML5
* CSS3
* JavaScript
* Axios
* React Router DOM

### Backend

* Python
* FastAPI
* Uvicorn
* MongoDB
* Gemini AI API
* SerpAPI
* OpenWeather API
* SMTP Email Service

# DEPLOYMENT

### Frontend Hosting

* Netlify

### Backend Hosting

* Render

# AUTHOR

Binod Kapadi