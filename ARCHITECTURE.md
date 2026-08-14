# Project Tracker Architecture

> **Status:** Current implementation
>
> **Verification basis:** Working tree based on current state

## 1. Executive summary
Project Tracker is a full-stack web application for managing projects, team members, and tasks. It allows users to organize work into projects, assign tasks to team members, and track progress through a lifecycle of 'todo', 'in_progress', and 'done'.

The system consists of a Node.js/Express backend, a MongoDB database, and a React frontend. It uses JWT for secure authentication and implements Role-Based Access Control (RBAC) to differentiate between administrative and standard user permissions.

The real data lives in a MongoDB database. A contributor must not bypass the authentication middleware when creating sensitive project-level resources.

## 2. System context
The system serves web users who need to manage project workflows. It interacts with:
- **Frontend:** A React web application.
- **Backend API:** A Node.js/Express server.
- **Database:** A MongoDB instance for persistence.
- **Storage:** Image data for tasks is currently stored as binary buffers in the database.

## 3. Architectural invariants
1. **Password Security:** Passwords must be hashed using bcrypt before storage. *Mechanism: Mongoose `pre('save')` hook in `User.ts`.*
2. **Role Enforcement:** Only users with the `admin` role can create projects or modify project membership. *Mechanism: `requireAdmin` middleware in project routes.*
3. **Ownership:** Every task must be associated with a valid project. *Mechanism: Schema validation in `Task.ts`.*
4. **Authentication:** Protected routes must verify the validity of the JWT. *Mechanism: `authenticate` middleware.*
5. **Validation:** All incoming requests must pass schema validation before business logic executes. *Mechanism: Zod schemas in `backend/src/validators/` and `validate` middleware.*

## 4. Components and dependencies
- **Backend:**
  - **Express:** Web framework for API routing.
  - **Mongoose:** ODM for MongoDB interactions.
  - **Bcryptjs:** For password hashing.
  - **JWT:** For stateless authentication.
  - **Multer:** For handling multipart/form-data (image uploads).
  - **Zod:** For request validation.
- **Frontend:**
  - **React:** UI library.
  - **React Router:** For client-side navigation.
  - **Axios:** For HTTP requests to the backend.
  - **@hello-pangea/dnd:** For drag-and-drop task interaction.
- **Infrastructure:**
  - **MongoDB:** Primary data store.

**Internal Architecture:**
- **Services:** `backend/src/services/` contains business logic for Projects, Tasks, Users, and Auth. Controllers are thin wrappers that handle requests and responses.
- **Validators:** `backend/src/validators/` contains Zod schemas for request validation. The `validate` middleware ensures data integrity before processing.

## 5. Critical flows
1. **Authentication:** User provides credentials -> `validate` middleware checks schema -> `AuthService.login()` verifies password and issues JWT -> Frontend stores JWT and includes it in `Authorization` headers.
2. **Project Creation:** Admin sends POST to `/projects` -> `validate` middleware validates request body -> `requireAdmin` checks role -> `ProjectService.createProject()` saves data -> Response sent.
3. **Task Management:** User updates task (status, assignee, or images) -> `validate` middleware validates request -> Permission check in controller/service -> MongoDB updated -> Frontend updates UI.
4. **Image Upload:** User uploads image via task endpoint -> Multer parses image -> `TaskService.uploadTaskImages()` saves Buffer to Task record -> Response sent.

## 6. Interfaces and data
- **Public APIs:** RESTful endpoints for `/auth`, `/projects`, and `/tasks`.
- **Data Models:**
  - `User`: Name, Email, Hashed Password, Role, Avatar.
  - `Project`: Name, Description, Members (User refs), CreatedBy (User ref).
  - `Task`: Title, Description, Project (Project ref), AssignedTo (User ref), Status, Images (Buffer array).
- **Internal Interfaces:**
  - **Services:** Own business logic. Do not own request/response handling.
  - **Controllers:** Own request/response handling. Do not own business logic or validation.
  - **Validators:** Own schema definitions. Used by middleware to check data integrity.

## 7. Security and trust boundaries
- **Identity:** Established via JWT issued upon login.
- **Authorization:** Enforced via middleware on routes (e.g., `requireAdmin`, `authenticate`).
- **Trust Boundary:** The frontend is untrusted. All business logic and permission checks are performed on the backend.
- **Failures:** The system fails closed on unauthorized access (401/403 status codes).

## 8. Failure, capacity, and operations
- **Failure Recovery:** Express handles request errors; Mongoose provides connection retry logic.
- **Capacity:** MongoDB handles persistence.
- **Hard Limits:** Image size is limited by Multer configuration.
- **Operator Actions:** Requires MongoDB connection string and JWT secrets via environment variables.

## 9. Verification
- **Tests:** Frontend includes unit and integration tests using React Testing Library.
- **Unverified:** No automated end-to-end tests are currently documented.

## 10. Known limitations
- **Image Storage:** Storing images as Buffers in MongoDB is not scalable for high-volume or high-resolution image storage.
- **Filtering:** No complex querying or advanced filtering for tasks is implemented in the current API.

## 11. Source map
- `backend/src/server.ts`: Application entry point.
- `backend/src/app.ts`: Global error handling and middleware chain.
- `backend/src/services/`: Business logic implementation.
- `backend/src/controllers/`: Request/response handlers.
- `backend/src/routes/`: API boundary definitions.
- `backend/src/middleware/`: Security (`authenticate`, `requireAdmin`) and validation (`validate`).
- `backend/src/validators/`: Zod schema definitions for request validation.
- `backend/src/models/`: Data schemas and invariants.
- `frontend/src/api/`: Centralized API client layer (Axios instance and service clients).
- `frontend/src/`: UI and client-side logic.
