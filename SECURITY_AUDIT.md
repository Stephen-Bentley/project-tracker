# Security Audit Report

## Executive Summary
This report identifies security vulnerabilities and areas for improvement in the Project Tracker application. The most critical issues are related to Broken Object Level Authorization (BOLA) and Insecure Direct Object Reference (IDOR).

## 1. Critical: Broken Object Level Authorization (BOLA)

### 1.1 Task Creation Authorization
- **Description:** The `TaskService.createTask` method does not verify if the user (`creatorId`) is a member of the specified `projectId`. This allows any authenticated user to create tasks in any project if they know the project's ID.
- **Impact:** An attacker can clutter projects they don't belong to with spam tasks or perform unauthorized data entry.
- **Recommendation:** In `TaskService.createTask`, first check if the `creatorId` is in the `members` list of the `projectId`.

### 1.2 Task Deletion/Modification Authorization
- **Description:** The `TaskService.deleteTask` and `TaskService.assignUserToTask` methods do not check if the authenticated user has permissions for the specific project the task belongs to.
- **Impact:** Users can delete tasks or change assignees for projects they are not members of.
- **Recommendation:** In the controller or service, verify that the `req.user.userId` is a member of the project associated with the `taskId` before executing the action.

## 2. High: Insecure Direct Object Reference (IDOR) - Image Access

### 2.1 Public Task Images
- **Description:** The `getTaskImage` endpoint is currently public. While this solves the problem of loading images in standard `<img>` tags without bearer tokens, it means anyone with a `taskId` and `imageId` can access the image.
- **Impact:** If `taskId` or `imageId` are predictable, unauthorized users can scrape task images.
- **Recommendation:** 
    - Implement signed URLs for image access.
    - Or, require authentication for image requests and have the frontend use `fetch`/`XHR` with authorization headers to create object URLs for the images.

## 3. High: Data Integrity - User Assignment

### 3.1 Unverified User Assignment
- **Description:** `TaskService.assignUserToTask` allows assigning any `userId` to a task without verifying that the target `userId` is a member of the project.
- **Impact:** A user can assign tasks to people who are not part of the project, leading to incorrect project state and data noise.
- **Recommendation:** In `assignUserToTask`, validate that the `userId` belongs to the `projectId` before performing the update.

## 4. Medium: Missing Rate Limiting

- **Description:** The API does not have rate limiting implemented.
- **Impact:** The application is vulnerable to brute-force attacks on the `/api/auth/login` endpoint and potential Denial of Service (DoS) attacks.
- **Recommendation:** Implement a rate-limiting middleware (like `express-rate-limit`) specifically for authentication and other sensitive routes.

## 5. Medium: Security Headers & CORS

### 5.1 CORS Configuration
- **Description:** CORS is configured globally with default settings.
- **Impact:** If not strictly configured, it might allow unexpected origins to interact with the API.
- **Recommendation:** Explicitly define an allow-list of origins in the CORS configuration.

### 5.2 Missing Security Headers
- **Description:** There is no explicit configuration for essential security headers (e.g., `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`).
- **Impact:** Increases vulnerability to Cross-Site Scripting (XSS) and Clickjacking.
- **Recommendation:** Integrate the `helmet` middleware in `app.ts`.

## 6. Low: JWT Lifecycle Management

- **Description:** JWTs are valid for 7 days with no refresh token mechanism.
- **Impact:** Users must re-authenticate every 7 days, and there is no easy way to revoke a specific user's access until the token expires.
- **Recommendation:** Consider implementing a refresh token mechanism (storing refresh tokens in an `HttpOnly` cookie) to allow for shorter-lived access tokens.
