# CallPulse - Call Tracking & Employee Performance Management System

An outbound call tracking, lead follow-up, and sales performance CRM built for a team of **4 callers** and **1 owner/admin**.

---

## 🚀 Live Local URL
The application is running and accessible at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 👥 System Accounts & Login Credentials

| Role | Name | Email | Password | Access Level |
| :--- | :--- | :--- | :--- | :---: |
| **Owner / Admin** | Ravi Kapadia | `ravikapadia@gmail.com` | `Ravi@1122` | Full Control & Command Center |
| **Caller 1** | Vaishali Shukla | `vaishalishukla@gmail.com` | `Vaishali@123` | Dedicated Workstation (Queue 1) |
| **Caller 2** | Shruti Chavda | `shrutichavda@gmail.com` | `Shruti@123` | Dedicated Workstation (Queue 2) |
| **Caller 3** | Riya Vasoya | `riyavasoya@gmail.com` | `Riya@123` | Dedicated Workstation (Queue 3) |
| **Caller 4** | Sanjana Amin | `sanjanaamin@gmail.com` | `Sanjana@123` | Dedicated Workstation (Queue 4) |

---

## 📁 Per-Caller Excel File Allocation Center

The Owner Dashboard includes a dedicated **Caller File Allocation Center**:
- **Caller 1 (Vaishali):** Click `[ 📤 Upload Excel for Vaishali ]` -> Upload Excel File 1 (e.g. 2,000 leads).
- **Caller 2 (Shruti):** Click `[ 📤 Upload Excel for Shruti ]` -> Upload Excel File 2 (e.g. 2,000 leads).
- **Caller 3 (Riya):** Click `[ 📤 Upload Excel for Riya ]` -> Upload Excel File 3 (e.g. 2,000 leads).
- **Caller 4 (Sanjana):** Click `[ 📤 Upload Excel for Sanjana ]` -> Upload Excel File 4 (e.g. 2,000 leads).

### High-Speed Batch Ingestion
- Ingests **2,000+ leads in under 400ms** using optimized batch inserts.
- **Smart Column Detection:** Automatically identifies columns for `Customer`, `mobile`, `email`, and `reference / notes`.
- **Interactive Column Mapper:** Change or verify column mappings with one click.
- **Batch Tagging:** Every lead is tagged with the file/batch name so you can monitor progress per file.

---

## 🎯 Calling Workflows & Dashboards

### 1. Employee Dashboard (`Caller Perspective`)
- **Real-Time Target Progress:** Daily calls completed vs. target (e.g. 45 / 150) with visual progress bar.
- **Isolated Queues:** Each caller only sees their own assigned leads from their respective Excel file.
- **Priority Queue:**
  - 🔴 **Overdue Follow-ups:** Missed callbacks flagged in red alerts.
  - 🟡 **Today's Follow-ups:** Scheduled appointments and callbacks due today.
  - 🟢 **Fresh Leads:** Uncontacted leads from their assigned Excel file.
- **Rapid Call Logging Modal (< 10 seconds):**
  - Remarks: `Interested`, `Call Back Later`, `Follow-Up Required`, `Converted`, `No Answer`, `Not Interested`, `Wrong Number`.
  - Auto-schedules follow-up date and time when callbacks are needed.
  - Call duration stopwatch and quick remark notes presets.

### 2. Owner Command Center (`Admin Perspective`)
- **Comparative Leaderboard (All 4 Callers):**
  - Side-by-side comparison of Vaishali, Shruti, Riya, and Sanjana: Calls Today, Target %, Connected %, Interested count, Converted deals, and Overdue Backlog.
- **Visual Analytics:**
  - Bar chart comparing daily call volume against targets.
  - Donut chart showing outcome distribution (% Interested vs % No Answer vs % Converted).
- **Lead Reassignment:** Move leads between callers if an employee is absent or behind schedule.
- **Daily Performance Reports:** 1-click download of daily aggregated CSV report (`/api/reports/daily?format=csv`).
