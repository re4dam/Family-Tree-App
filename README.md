# Family Tree Application

An interactive web application and API for mapping and exploring family lineages. Designed with a premium dark theme dashboard, high-performance graph renderings, and fuzzy searches.

## 🚀 Recommended Tech Stack

| Layer | Choice |
| :--- | :--- |
| **Frontend Framework** | Next.js (React 19) + TypeScript |
| **Graph Visualization** | React Flow (`@xyflow/react`) |
| **Backend API** | .NET 10 (ASP.NET Core) + HotChocolate GraphQL |
| **Database** | PostgreSQL (EF Core + Npgsql with pooled factory) |
| **Authentication** | ASP.NET Core Identity + JWT Bearer Tokens |

---

## 📂 Project Structure

```text
Family-Tree-App/
├── frontend/                     # Next.js App Router project
│   ├── src/
│   │   └── app/                  # Main page, routing, layouts, and styles
│   └── package.json              # React Flow and Lucide icons installed
├── backend/                      # .NET solution
│   ├── FamilyTree.slnx           # Solution definition (.NET 10 XML format)
│   └── src/
│       ├── FamilyTree.Api/       # ASP.NET Core Web API (HotChocolate and Identity config)
│       ├── FamilyTree.Core/      # Domain entities (Person, Relationship edges, User accounts)
│       └── FamilyTree.Infrastructure/ # Data Context (EF Core configurations & PostgreSQL)
├── TODO.md                       # Feature spec and scoping document
└── README.md                     # This documentation file
```

---

## 🛠️ Running Locally

### 1. Prerequisites
- **Node.js** v22.x+ & **npm** v10.x+
- **.NET SDK** 10.x+
- **PostgreSQL** instance running locally or in Docker

### 2. Backend Setup
1. Open a terminal and navigate to the backend API directory:
   ```bash
   cd backend/src/FamilyTree.Api
   ```
2. Update the connection string under `"ConnectionStrings": { "DefaultConnection": "..." }` in `appsettings.json` to point to your PostgreSQL database.
3. Apply database migrations and run the server:
   ```bash
   dotnet run
   ```
4. The server runs by default on `http://localhost:5000` (HTTP) / `https://localhost:5001` (HTTPS).
5. Navigate to `http://localhost:5000/graphql` to open the **Banana Cake Pop GraphQL IDE** to run queries and mutations.

### 3. Frontend Setup
1. Open a terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies (already configured):
   ```bash
   npm install
   ```
3. Launch the development server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000` in your browser.

---

## 🧬 GraphQL Queries

To explore the schema and test the APIs in Banana Cake Pop:

- **Welcome Query**:
  ```graphql
  query {
    welcome
  }
  ```
- **Ping Mutation**:
  ```graphql
  mutation {
    ping(message: "Hello Family Tree")
  }
  ```
