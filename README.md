# NayePankh Foundation — Volunteer Registration System

A full-stack Volunteer Registration System built for the NayePankh Foundation internship project. Matches the NayePankh brand identity (purple/white, Poppins font, clean card layout) and is production-ready.

---

## Admin Access

Live demo credentials:

- **URL:** https://volunteer-reg-system.onrender.com/admin
- **Username:** admin
- **Password:** NayePankh@2026

## Features

### Public-facing
- **Volunteer Registration Form** — name, age, email, phone, city, areas of interest (multi-select), availability, and a message field
- Client-side validation with clear error messages
- Duplicate registration detection (by email)
- Thank-you confirmation screen after successful submission

### Admin Panel (`/admin`)
- **Secure login** with bcrypt-hashed passwords and JWT session cookies (8-hour expiry)
- **Dashboard summary** — total volunteers, counts by status (New / Contacted / Active / Inactive), top 5 cities
- **Volunteers table** — search by name, email, or city; filter by status and area of interest
- **Status management** — change a volunteer's status inline from the table
- **Delete records** — remove a volunteer with a confirmation prompt
- **CSV export** — download a full report with one click

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (v16+) |
| Backend | Express.js |
| Auth | bcryptjs + jsonwebtoken |
| Database | JSON file (zero native deps, runs anywhere) |
| Frontend | Vanilla HTML / CSS / JavaScript |
| Font | Poppins via Google Fonts |

---

## Project Structure

```
volunteer-reg-system/
├── public/
│   ├── index.html      # Volunteer registration form (public)
│   ├── admin.html      # Admin login + dashboard
│   ├── script.js       # Public form logic
│   ├── admin.js        # Admin dashboard logic
│   └── styles.css      # Shared styles (NayePankh brand)
├── server/
│   ├── index.js        # Express server + all API routes
│   ├── auth.js         # JWT middleware
│   ├── db.js           # JSON file database utilities
│   ├── setup-admin.js  # One-time admin account creation
│   └── data/
│       └── db.json     # Auto-created on first run
├── .env.example        # Environment variable template
├── package.json
└── README.md
```

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment (optional for development)

```bash
cp .env.example .env
# Edit .env if you want to change port, JWT secret, or admin credentials
```

### 3. Create the first admin account

```bash
node server/setup-admin.js
```

Default credentials (change in `.env` before running):
- **Username:** `admin`
- **Password:** `NayePankh@2026`

### 4. Start the server

```bash
npm start
```

The server will start at **https://volunteer-reg-system.onrender.com/**

| Page | URL |
|---|---|
| Volunteer registration form | https://volunteer-reg-system.onrender.com/ |
| Admin dashboard | https://volunteer-reg-system.onrender.com/admin |

---

## API Reference

### Public endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/areas` | List all areas of interest |
| POST | `/api/volunteers` | Submit a new volunteer registration |

### Admin endpoints (require login cookie)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/admin/login` | Log in |
| POST | `/api/admin/logout` | Log out |
| GET | `/api/admin/me` | Check current session |
| GET | `/api/admin/volunteers` | List volunteers (supports `search`, `status`, `area` query params) |
| PATCH | `/api/admin/volunteers/:id/status` | Update volunteer status |
| DELETE | `/api/admin/volunteers/:id` | Delete a volunteer |
| GET | `/api/admin/summary` | Dashboard stats |
| GET | `/api/admin/report.csv` | Download all volunteers as CSV |

---

## Volunteer Statuses

| Status | Meaning |
|---|---|
| **New** | Just registered, not yet reviewed |
| **Contacted** | Team has reached out |
| **Active** | Currently volunteering |
| **Inactive** | No longer active |

---

## Deployment Notes

- For production, set a strong `JWT_SECRET` in your `.env` file
- The `server/data/db.json` file is your database — back it up regularly
- To run on a VPS/cloud server, use a process manager like `pm2`:
  ```bash
  npm install -g pm2
  pm2 start server/index.js --name nayepankh-volunteers
  pm2 save
  ```
- For HTTPS (required in production), put the app behind an Nginx reverse proxy with a Let's Encrypt SSL certificate


Designed to match the visual identity of [nayepankh.com](https://nayepankh.com)
