# WealthVision AI - Smart Financial Assistant

WealthVision AI is a personal financial assistant powered by Generative AI designed to help users manage their finances effectively and intelligently. This application was built as the Capstone Project for the AI Engineer course.

**Status:** 🚀 Completed (100%)  
**Domain:** Finance & Banking

---

## 🌟 Core Features

This application successfully implements all mandatory requirements (17 criteria), including:

1. **Dashboard & Data Visualization:** Tracks transactions and displays summaries using Pie Charts and Bar Charts (6-month trends) using Recharts.
2. **AI Advisor & Chatbot Interface:** A smart AI assistant (featuring a Floating AI widget accessible anywhere) for Financial Medical Check-ups, analyzing spending patterns (detecting overspending), and providing actionable insights.
3. **Smart Budgeting (50-30-20):** Automatically allocates monthly budget limits based on the 50% Needs, 30% Wants, and 20% Savings ratio.
4. **Savings Goal Planner:** Allows users to define savings goals, while the AI generates custom monthly saving strategies (e.g., Snowball strategy) to achieve them.
5. **Investment Guidance:** Provides automated investment advice tailored to the user's selected risk profile (Conservative, Moderate, Aggressive).
6. **Reports & History:** Comprehensive transaction management with manual input, bulk **Import CSV**, and the ability to export financial data to **PDF Reports** and CSVs.
7. **Secure Authentication System:** Complete registration, login, logout, and profile management secured with modern password hashing.

---

## 🏗️ Project Structure & Modularity

The application follows a clean, modular Client-Server Architecture:

### 1. Frontend (Next.js & Tailwind CSS)
Located in the `frontend-finance/` directory.
- **`src/app/`**: Utilizes Next.js App Router for independent page routing (e.g., `/dashboard`, `/ai-advisor`, `/budgeting`, `/savings`).
- **`src/components/`**: Contains highly modular and reusable UI components (e.g., `Sidebar`, `TopNavbar`, `FloatingAI`).
- **`src/context/`**: Uses React Context API for global state management (Authentication and i18n multi-language preferences).
- **`src/lib/`**: Collection of helper functions (currency formatting, API constants).

### 2. Backend (Flask & PostgreSQL)
Located in the `app.py` file.
- REST API architecture managing a PostgreSQL database using **SQLAlchemy**.
- All endpoints are strictly validated and secured using `@login_required` decorators.
- Seamlessly integrates with LLM APIs (OpenAI/Gemini) to process financial logic prompts.

---

## 💻 Tech Stack

* **Frontend:** Next.js 16, React 19, Tailwind CSS v4, Recharts, React Markdown.
* **Backend:** Python, Flask 3.1, PostgreSQL.
* **AI Engine:** Generative AI (LLM API).

---

## 🚀 Quick Start Guide

**Step 1: Backend Setup**
1. Open a terminal in the root directory (where `app.py` is located).
2. Activate your Python Virtual Environment.
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file based on `.env.example` and configure your Database credentials and AI API Keys.
5. Ensure you have PostgreSQL installed and running. Create an empty database named `wealthvision_db` (or matching your `.env` configuration) via pgAdmin or psql:
   ```sql
   CREATE DATABASE wealthvision_db;
   ```
6. Run the Flask server (SQLAlchemy will automatically generate all tables inside the database):
   ```bash
   python app.py
   ```

**Step 2: Frontend Setup**
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend-finance
   ```
2. Install Node.js dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser and visit `http://localhost:3000`.

---
*Developed by Ariel Devananda.*