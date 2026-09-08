# 💡 LED Pro — Commercial Lighting Management App

A full-stack mobile and web application built for a commercial LED lighting company to replace manual spreadsheet-based workflows with a modern, collaborative, real-time tool used across the office and in the field.

> **Status:** MVP complete · V2 features in progress

---

## What It Does

LED Pro replaces paper notebooks and Excel spreadsheets that field teams use when surveying buildings for LED lighting upgrades. It allows the owner, field partners, and electricians to collaborate in real time — counting existing lights, specifying replacements, tracking installations, and generating professional scope of work documents.

---

## Screenshots

> *(Screenshots to be added)*

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile app | React Native + Expo |
| Web app | React Native Web (same codebase) |
| Database | Supabase (PostgreSQL) |
| Real-time sync | Supabase Realtime |
| Offline support | AsyncStorage + queue sync |
| Push notifications | Expo Notifications |
| Version control | Git + GitHub |
| Language | JavaScript / TypeScript |

---

## Features Built

### Authentication
- Team member picker with 4-digit PIN login
- Remember me on device
- Role-based access (owner, partner, electrician)
- Switch user without full logout

### Job Management
- Create jobs with name, location, date, and mode selection
- Variable columns per job (occupancy sensor, photocell, layout, hours flag)
- Variable columns editable after job creation — data preserved when toggled off
- Job-level auto-saving notes visible to all team members

### Counting Mode
- Add areas freely — any partner can add without owner pre-configuration
- Paired light rows: each row captures current light type → new light type replacement
- Multiple light types per area, fully independent
- Hours-based flag per light row with start/end time range
- "Removed only" and "New addition" flags for edge cases
- Real-time collaboration — changes appear live across all devices
- Name tag on each area showing who entered it
- Progress bar tracking completed areas

### Layout Visualizer
- Grid canvas with snap-to-tile
- Freehand drawing mode for irregular spaces
- Shape templates: 2×4, 2×2, High Bay, Round Can, Vapor Tight
- Before/after ghost overlay — old positions shown faded, new positions solid
- Export as PNG image

### Electrician Mode
- Mirrors counting data for reference
- Install status per light row (Pending / In Progress / Complete)
- "Removed, not replaced" flag with notes field
- Follow-up flag to notify owner of issues
- Offline support — saves locally and syncs when connection restores

### Scope of Work Export
- Auto-generates a professional PDF scope document from field count data
- Summary totals (current fixtures, new fixtures, areas covered)
- Table view: area → current type → new type → lumen setting → hours
- Flags removed-only and new-addition rows
- Print or save as PDF directly from browser

### Change Log
- Records every save with who made the change and when
- Visible per job — helps recover accidental overwrites during collaboration
- Shows area-level and job-level events

### Push Notifications
- Notifies team when an area is marked complete
- Notifies when a job is fully complete
- Notifies when a job note is added
- Per-user notification preferences in Settings

### Settings
- Manage light type dropdowns globally (add/remove, current and new LED categories)
- Team member list with roles and PIN status
- Notification preference toggles per user
- Log out

---

## Role Permissions

| Feature | Owner | Partner | Electrician |
|---|---|---|---|
| Create jobs | ✅ | ✅ | ✅ |
| Add areas | ✅ | ✅ | ❌ |
| Delete areas | ✅ | ✅ | ❌ |
| Count lights | ✅ | ✅ | ✅ |
| Electrician mode | ✅ | ✅ | ✅ |
| Export scope PDF | ✅ | ✅ | ✅ |
| Manage settings | ✅ | ✅ | ✅ |

---

## Running Locally

### Prerequisites
- Node.js (LTS)
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (iOS or Android)
- Supabase account

### Setup

```bash
# Clone the repository
git clone https://github.com/uchicc42/led-pro.git
cd led-pro

# Install dependencies
npm install

# Create a supabase.js file at the root with your credentials
# See supabase.example.js for the format

# Start the development server
npx expo start
```

- Press `w` to open in browser
- Scan the QR code with Expo Go to open on your phone

### Database
The app uses Supabase for the backend. Tables include: `jobs`, `areas`, `light_rows`, `light_types`, `team_members`, `install_rows`, `change_log`.

---

## Roadmap

### V2 — In Progress
- [x] Paired old → new light replacement rows
- [x] PDF scope of work export
- [x] Push notifications with user preferences
- [x] Change log / edit history
- [x] Role-based permissions
- [ ] QuickBooks Online sync for light type list

### V3 — Planned
- [ ] Admin dashboard (revenue, jobs, open quotes summary)
- [ ] iOS App Store and Google Play Store publishing
- [ ] Customer-facing appointment scheduling
- [ ] Enhanced reporting and analytics

---

## Project Background

Built for a real commercial LED lighting company to solve a genuine workflow problem — the team was managing complex multi-area light counts using notebooks and Excel spreadsheets, with no way to collaborate in real time while split across a building. LED Pro replaces that workflow with a purpose-built tool that works on both phones and laptops simultaneously.

---

## Author

Built by a developer learning React Native through a real-world project.

---

*LED Pro is a private internal tool — not publicly distributed.*
