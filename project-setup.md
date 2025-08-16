# Project Setup

This document outlines the steps required to set up and run the project locally.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- [Node.js](https://nodejs.org/) (v20.x or later)
- [Bun](https://bun.sh/) (v1.x or later)
- [pnpm](https://pnpm.io/) (v8.x or later)

## Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd scorer-app
   ```

2. **Install dependencies:**

   This project uses `pnpm` for package management. To install the required dependencies, run the following command:

   ```bash
   pnpm install
   ```

## Database Setup

This project uses [Prisma](https://www.prisma.io/) as its ORM. To set up the database, follow these steps:

1. **Create a `.env` file:**

   Create a `.env` file in the root of the project and add the following environment variable:

   ```
   DATABASE_URL="file:./dev.db"
   ```

2. **Run database migrations:**

   To apply the database schema, run the following command:

   ```bash
   npx prisma migrate dev
   ```

3. **Seed the database:**

   To populate the database with initial data, run the following command:

   ```bash
   npx prisma db seed
   ```

## Database Schema

The database schema is defined in the `prisma/schema.prisma` file. It includes the following models:

- **Player**: Represents a cricket player.
- **Team**: Represents a cricket team.
- **Match**: Represents a cricket match between two teams.
- **TeamPlayer**: A join table that links players to teams for a specific match.
- **Innings**: Represents an innings in a match.
- **Ball**: Represents a single ball bowled in an innings.
- **PlayerStats**: Stores player statistics for each match.

### Interacting with the Database

You can interact with the database using [Prisma Studio](https://www.prisma.io/studio), a visual editor for your database. To open Prisma Studio, run the following command:

```bash
npx prisma studio
```

## Running the Application

To start the development server, run the following command:

```bash
pnpm dev
```

The application will be available at [http://localhost:9002](http://localhost:9002).

## Running Genkit

To run the Genkit AI flows, use the following command:

```bash
pnpm genkit:dev
```

## Running Tests

To run the test suite, use the following command:

```bash
pnpm test
```

To run the tests in UI mode, use:

```bash
pnpm test:ui
