# 🛡️ Complete Course Auditor (Reviewer) Portal Documentation
## **Functional Guide, Screen-by-Screen Options & Exact Code/Function Breakdown**

---

## 1. Overview: Auditor (Reviewer) Ka Kya Role Hai?

**Course Auditor (`REVIEWER` Role)** platform ka **Quality Gatekeeper** hota hai. Koi bhi Instructor jab:
1. **Naya Course (`NEW — v1.0`)** submit karta hai, YA
2. **Already Published Course (`v1.0`)** mein koi **Major Change (`MAJOR_UPDATE — v2.0`)** (jaise Video badalna, Curriculum lecture add/delete karna, Price badalna, ya Quiz badalna) karke review ke liye bhejta hai, YA
3. Changes request hone ke baad dobara **Resubmit (`RESUBMISSION`)** karta hai,

toh wo course seedha **Auditor Dashboard (`/reviewer`)** mein aata hai. Jab tak Auditor uski Video, PDF, Quiz, Pricing, aur Learning Outcomes verify karke **Approve ✅** nahi karta, tab tak wo naya course (ya `v2.0` update) students ke liye live nahi hota.

---

## 2. Screen-by-Screen Options & Features (Kya-Kya Option Hai)

### 🖥️ Screen 1: Auditor Sidebar & Portal Shell (`src/components/reviewer/AuditorPortalShell.tsx`)
- **Left Sidebar Navigation Options**:
  1. **Auditor Dashboard (`/reviewer`)**: Main review queue aur KPI metrics.
  2. **Pending Queue (`?status=IN_REVIEW`)**: Jin courses ka audit abhi baaki hai.
  3. **Major Updates v2.0 (`?type=MAJOR_UPDATE`)**: Sirf published courses ke `v2.0` staged updates.
  4. **Changes Requested (`?status=CHANGES_REQUESTED`)**: Jin courses mein Auditor ne correction maanga hai.
  5. **Approved Courses (`?status=APPROVED`)**: Jo courses Auditor ne pass kar diye hain.
  6. **Rejected Courses (`?status=REJECTED`)**: Jo courses policy/quality fail hone par reject kiye gaye hain.
  7. **Sign Out Button**: `POST /api/auth/logout` call karke `reviewer_session_token` clear karta hai.

### 📊 Screen 2: Auditor Dashboard (`/reviewer` — `src/app/reviewer/page.tsx`)
- **Top 6 KPI Summary Cards**:
  1. **Pending Reviews**
  2. **In Review**
  3. **Approved Today**
  4. **Rejected / Changes**
  5. **Recently Updated (v2.0)**
  6. **Avg Review Time (`1.8 hrs`)**
- **Queue Filters & Search**:
  - **Status Filters**: `All`, `Pending / In Review`, `Changes Requested`, `Approved`, `Rejected`
  - **Submission Type Filter**: `All`, `New Courses (v1.0)`, `Major Updates (v2.0)`, `Resubmissions`
  - **Search Bar**: Course Title, Instructor Name/Email, Category search.
- **Main Queue Table Actions**:
  - **`Preview` Button**: Opens `/reviewer/courses/[id]/preview` (Student-View Sandbox).
  - **`Review` Button**: Opens `/reviewer/courses/[id]` (6-Tab Course Audit Studio).

### 🔍 Screen 3: 6-Tab Course Audit Studio (`/reviewer/courses/[id]` — `src/app/reviewer/courses/[id]/page.tsx`)
- **Top Action Buttons**:
  1. **`Preview as Student`** (`/reviewer/courses/[id]/preview`)
  2. **`Approve Course ✅`** (`APPROVE`)
  3. **`Request Changes ⚠️`** (`REQUEST_CHANGES`)
  4. **`Reject Course ❌`** (`REJECT`)
- **6 Inspection Tabs**:
  1. **Tab 1 (`Overview & 17-Point Checklist`)**: Full metadata + Fake Discount/Pricing Policy Audit + 17-Point Quality Checklist across 5 categories (`Content`, `Video`, `Technical`, `Learning Value`, `Policy`) + Auto Score (`0-100%`).
  2. **Tab 2 (`Curriculum, Video & PDF`)**: Module/Lesson tree + Signed Video Player (`1x-2x` speed) + Sandboxed PDF Viewer + Per-Lesson `PASS ✅` / `ISSUE ⚠️` marking with notes.
  3. **Tab 3 (`Quizzes & Assignments`)**: Quiz questions, options, highlighted correct answer (`● Correct Answer ✓`), explanation, passing score, and assignment details.
  4. **Tab 4 (`Outcomes Mapping`)**: Learning Outcomes mapped to corresponding curriculum lessons.
  5. **Tab 5 (`v1.0 vs v2.0 Diff`)**: Exact delta comparison (`+ Added`, `~ Updated`, `~ Changed Pricing`) between Live `v1.0` and Staged `v2.0` + Rollback Archive list.
  6. **Tab 6 (`Section Issues & Audit Log`)**: Section-wise issue tagger (`Video`, `Curriculum`, `PDF`, `Quiz`, `Pricing` + `Module 3 -> Lesson 4`), Private Auditor Notes, and chronological Review History.

---

## 3. Technical Function-by-Function Reference

1. **`getReviewerCurrentUser()` & `requireReviewerAuth()` (`src/lib/auth.ts`)**: Verifies `reviewer_session_token` JWT cookie and enforces `REVIEWER` / `ADMIN` / `SUPER_ADMIN` role.
2. **`getCourseAuditMetadata(courseId)` & `saveCourseAuditMetadata(...)` (`src/lib/course-audit.ts`)**: Reads and persists the 17-point checklist, per-lesson `PASS`/`ISSUE` status, section-wise issues, private auditor notes, and review history in `AuditLog` (`entity: 'COURSE_AUDIT_META'`).
3. **`computeChecklistScore(checklist)` (`src/lib/course-audit.ts`)**: Calculates `0-100%` quality score from the 17 checklist checkboxes.
4. **`GET /api/reviewer/courses` (`src/app/api/reviewer/courses/route.ts`)**: Powers the `/reviewer` dashboard table, filters, and 6 KPI cards.
5. **`computeVersionDiff(liveCourse, stagedSnap)` (`src/app/api/reviewer/courses/[id]/review/route.ts`)**: Generates the `v1.0` vs `v2.0` comparison diff.
6. **`GET / PATCH / POST /api/reviewer/courses/[id]/review` (`src/app/api/reviewer/courses/[id]/review/route.ts`)**: Loads the 6-tab review studio, saves draft checklists/issues (`PATCH`), and executes `APPROVE` / `REQUEST_CHANGES` / `REJECT` (`POST`).
7. **`applyApprovedVersionToLiveCourse(...)` (`src/lib/course-versioning.ts`)**: Promotes staged `v2.0` changes to the live course while archiving `v1.0` for rollback.
