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


### Configure Environment Variables (.env) (Local Host Setup)

    # MongoDB
    MONGODB_URI=your_mongodb_uri
    MONGODB_DBNAME=your_database_name

    # SerpAPI (Google Places autocomplete & search fallback)
    SERPAPI_KEY=your_serpapi_key

    # Web Search Providers 
    TAVILY_API_KEY=your_travily_api
    SERPER_API_KEY=your_serper_api

    # OpenWeather
    OPENWEATHER_API_KEY=your_openweather_api_key

    # Gemini
    GEMINI_API_KEY=your_gemini_api_key

    # Groq
    GROQ_API_KEY=your_groq_api_key

    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret

    GITHUB_CLIENT_ID=your_github_client_id
    GITHUB_CLIENT_SECRET=your_github_client_secret

    LINKEDIN_CLIENT_ID=your_linkedin_client_id
    LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

    # SMTP (for sending itinerary + OTP codes + notifications)
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=your_email@gmail.com
    SMTP_PASSWORD=your_app_password
    EMAIL_FROM=your_email@gmail.com
    NOTIFY_EMAIL=your_email@gmail.com

### For Production environment Variables (Put these all inside Render environment variable)

    #If you have hosted frontend urls in multiple platfrom (like vercel or netlify)
    FRONTEND_URLS=your_frontend_vercel_url, your_frontend_netlify_url

    **[Note] if you have hosted frontend in single platform only(ie vercel) then put(single url)
    FRONTEND_URLS=your_frontend_vercel_url

    MONGODB_URI=your_mongodb_uri
    MONGODB_DBNAME=your_database_name

    SERPAPI_KEY=your_serpapi_key

    TAVILY_API_KEY=your_travily_api
    SERPER_API_KEY=your_serper_api

    OPENWEATHER_API_KEY=your_openweather_api_key

    GEMINI_API_KEY=your_gemini_api_key

    GROQ_API_KEY=your_groq_api_key

    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret

    GITHUB_CLIENT_ID=your_github_client_id
    GITHUB_CLIENT_SECRET=your_github_client_secret

    LINKEDIN_CLIENT_ID=your_linkedin_client_id
    LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

    # Brevo Email API Config (Required/Recommended for Render Free Tier to bypass SMTP port blocking)

    BREVO_API_KEY=your_brevo_api_key_here
    ENVIRONMENT=production
    SENDER_EMAIL=your_email@gmail.com
    SENDER_NAME = TripAdvisor

    #For Production only (Beacuse while signing through google, github and linkden or for email purpose the backend must know who i am)(put inside render environment vairables)

    BASE_URL=your_production_backend_url

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
Local Backend url

    VITE_API_BASE_URL=http://127.0.0.1:8000

For Production only(Replace local backend url and put production backend url while pushing code to github only then after succesful pushing put local url back)

    VITE_API_BASE_URL=Your_Production_URL (Production URL)


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

### STOP APPLICATION

To stop the [Frontend and Backend] server:

    CTRL + C

### DEACTIVATE VIRTUAL ENVIRONMENT

After completing your work:

    deactivate

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