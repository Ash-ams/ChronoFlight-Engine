# ChronoFlight Engine & Evaluation Console

![ChronoFlight](/public/favicon.ico) *An Interactive Aviation Analytics Toolkit*

ChronoFlight is a high-fidelity Next.js application that bridges the gap between raw PostgreSQL analytics and dynamic frontend visualization. Built as an "Evaluation Console," this application combines a cinematic, interactive 3D WebGL landing page with a robust data dashboard backed by Supabase.

---

## 🚀 Key Features

*   **Cinematic WebGL Landing Page (React Three Fiber)**
    *   Features a custom-engineered 3D particle system supporting over 5,000 dynamically moving elements.
    *   Incorporates real-time **MediaPipe hand-tracking** allowing users to physically morph the particle engine into predefined geometric shapes (Airplane, Radar, Compass, Globe).
    *   Advanced GSAP orchestrations, spherical transitions, and interactive particle repulsion physics dynamically driven by mouse and physics interactions.
    
*   **Aviation Analytics Dashboard**
    *   A 'Dark Aero' glassmorphic dashboard showcasing complex SQL query evaluation.
    *   Over **15 Advanced Supabase Queries** implemented natively via Remote Procedure Calls (RPCs) and PostgreSQL Views.
    *   **Dynamic Data Visualizations**: Real-time integration with `recharts` for charting high-delay routes, manufacturer reliability, route profitability, and weather impacts. 
    *   **Educational Overlay**: Features real-time `react-syntax-highlighter` blocks exposing the underlying PostgreSQL query driving the views on the dashboard for deep-dive technical reviews.

---

## 🛠 Technology Stack

**Frontend Framework**
*   [Next.js 16](https://nextjs.org/) (App Directory)
*   [React 19](https://react.dev/)

**3D Graphics & Animation**
*   [Three.js](https://threejs.org/) & [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/) 
*   [Drei](https://github.com/pmndrs/drei)
*   [GSAP](https://gsap.com/) (GreenSock Animation Platform)
*   [Framer Motion](https://www.framer.com/motion/)

**Data & Interactions**
*   [Supabase](https://supabase.com/) (`@supabase/supabase-js`)
*   [MediaPipe Tasks Vision](https://developers.google.com/mediapipe) (Hand-tracking)
*   [Recharts](https://recharts.org/)
*   [Simplex-Noise](https://github.com/jwagner/simplex-noise.js)

**Styling & UI**
*   [TailwindCSS 4](https://tailwindcss.com/)
*   [Lucide React](https://lucide.dev/) (Iconography)

---

## ⚙️ Local Development

### 1. Prerequisites
Ensure you have Node.js 20+ installed.

### 2. Environment Variables
To populate the dashboard data, root your application to your active Supabase database by creating a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Installation
Install the project dependencies using your preferred package manager:

```bash
npm install
```

### 4. Running the Application
Spin up the local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the cinematic landing page.
Navigate to [http://localhost:3000/dashboard](http://localhost:3000/dashboard) to explore the Evaluation Console.

---

## 🏛 Project Structure

*   **/src/app/page.tsx** - The 3D cinematic landing page featuring the state-based particle morphological engine.
*   **/src/app/dashboard/page.tsx** - The main Evaluation Console containing the sidebar queries, layout blocks, and dynamic recharts configs.
*   **/src/app/globals.css** - Custom configured CSS utilizing advanced webkit scrollbar overrides and dark-mode aviation aesthetic tokens.

---

## 📜 License
This project is for demonstration and evaluation purposes.
