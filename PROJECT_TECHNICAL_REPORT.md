# 📘 Master Project Report & Technical Documentation
## **Morena Teach — Multi-Tenant Enterprise LMS, Instructor Studio, Course Audit Engine & B2B Sales Platform**

---

## 1. Executive Summary (Project Overview — Kya Work Hai)

**Morena Teach LMS** ek production-grade, **Multi-Tenant EdTech SaaS & Learning Management System (LMS)** hai jo Udemy, Coursera, aur Teachable jaise enterprise platforms ki tarah kaam karta hai. Is platform mein **6 Role-Based Portals** ek hi unified Next.js full-stack architecture par chalte hain:

1. **Public Storefront & Student Learning Portal (`/`, `/courses`, `/student/*`, `/learn/*`)**:
   - Public course marketplace, search/category filtering, SEO landing pages, cart/wishlist, coupon engine, checkout, interactive DRM-protected Video/PDF/Quiz classroom player, Q&A, assignments, aur verified certificates.
2. **Instructor Studio (`/instructor/*`)**:
   - Teachers/Faculty ke liye complete course creation builder, **Course Version Protection (`v1.0` Live vs `v2.0` Staged Draft)**, **256-bit Signed DRM Content Security**, **Student-View Preview Sandbox**, **Course SEO Studio**, Quizzes, Question Bank, Assignments, Student Q&A, Announcements, Revenue Wallet, Bank KYC Verification, Payouts, aur Support Ticket Desk.
3. **Course Auditor / Quality Reviewer Portal (`/reviewer/*`)**:
   - Dedicated **23-Point Course Quality Audit System** jahan Auditors naye courses (`NEW v1.0`), published courses ke major updates (`MAJOR_UPDATE v2.0`), aur resubmissions (`RESUBMISSION`) ko check karte hain (Video stream testing, PDF preview, Quiz answers verification, Learning Outcome mapping, Version Diff comparison, 17-point quality checklist, Section-wise issues, Approve / Request Changes / Reject with Audit Log).
4. **LMS / Organization Admin Portal (`/admin/*`)**:
   - Users, Instructors, Reviewers, Courses, Categories, Orders, Subscriptions, Coupons, Payout approvals, aur Branding manage karne ke liye.
5. **Super Admin Global Control Center (`/super-admin/*`)**:
   - Multi-tenant organizations, SaaS plans, platform-wide security, audit logs, aur global revenue monitoring ke liye.
6. **Sales & B2B CRM Portal (`/sales/*`)**:
   - Leads, B2B customers, enterprise subscriptions, marketing campaigns, aur sales analytics ke liye isolated CRM portal.

---

## 2. Technology Stack (Technical Kya-Kya Use Kiya Hai)

| Layer | Technology / Library | Version | Purpose / Use Case |
| :--- | :--- | :--- | :--- |
| **Frontend & Full-Stack Framework** | **Next.js (App Router)** | `16.3.3` | Server Components (SSR), Client Components, API Route Handlers (`/api/*`), Edge Middleware (`src/middleware.ts`) |
| **UI Library** | **React & React DOM** | `19.2.8` | Component-driven interactive UI, Custom Contexts (`AppContext`, `AdminContext`), Suspense boundaries |
| **Language** | **TypeScript** | `5.x` | End-to-end static type safety across frontend, API routes, and database queries |
| **Styling & Design System** | **Tailwind CSS v4 + clsx + tailwind-merge** | `4.x` | Responsive modern UI, dark/light surfaces, glassmorphism, custom animations |
| **Animations & Visuals** | **GSAP (`@gsap/react`) + Canvas Confetti** | `3.15.0` | Smooth hero transitions, micro-interactions, certificate celebration effects |
| **Database ORM** | **Prisma ORM (`@prisma/client`)** | `6.4.1` | Type-safe schema modeling, relational queries, migrations (`prisma/schema.prisma`) |
| **Database Engine** | **PostgreSQL (Cloud Hosted)** | `PostgreSQL 15/16` | Relational storage for Users, Organizations, Courses, Sections, Lessons, Quizzes, Enrollments, Orders, Payouts, AuditLogs |
| **Authentication & Session Security** | **Jose (`SignJWT` / `jwtVerify`) + BcryptJS** | `6.0.8` / `3.0.2` | HS256 JWT HttpOnly cookies with **Multi-Portal Cookie Isolation** (`lms_session_token`, `reviewer_session_token`, `sales_session_token`) + 12-round Bcrypt password hashing |
| **Content DRM & Media Security** | **Node.js `crypto` (HMAC-SHA256)** | Native | Expiring signed video/PDF stream tokens (`/api/lessons/[id]/stream`), anti-piracy dynamic student watermark (`Name • Email • IP`) |
| **Email & OTP Service** | **Nodemailer (SMTP)** | `9.0.5` | 6-digit Email OTP verification, password reset emails, course approval/rejection alerts |
| **Validation & Export Utilities** | **Zod + PptxGenJS** | `3.24.2` / `4.0.1` | Payload schema validation & presentation/report generation |

---

## 3. Hosting, Deployment & Infrastructure (Kahan Aur Kaise Host Ho Raha Hai)

1. **Source Code Repository (GitHub)**:
   - **Git Remote URL**: `https://github.com/piyushshri253-arch/lms.git`
   - **Active Production Branch**: `main`
2. **Application Cloud Hosting (Vercel)**:
   - Project **Vercel Cloud Platform** par host ho raha hai, jo GitHub ke `main` branch se directly connected hai.
   - Jab bhi `git push origin main` kiya jata hai, Vercel automatically naya deployment trigger karta hai.
   - **Build Command**: `prisma generate && next build --webpack`
   - **Post-Install Hook**: `prisma generate`
3. **Database Hosting (Managed PostgreSQL)**:
   - Cloud PostgreSQL database (`DATABASE_URL` environment variable ke zariye connected).
   - Schema changes `npx prisma db push` ke through sync kiye jaate hain.
4. **Environment Variables Required on Hosting (Vercel Settings)**:
   - `DATABASE_URL`: PostgreSQL connection string (`postgresql://...`)
   - `JWT_SECRET`: 256-bit secret key for signing session tokens & HMAC media tokens
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: Email OTP & transactional notifications ke liye
   - `NEXT_PUBLIC_APP_URL`: Live hosted domain URL
