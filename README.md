# Scripture Jeopardy

Interactive Jeopardy-style web app built with React + Vite and Material UI. Questions are loaded from a JSON file and can be edited without changing code.

## Configure Questions

Update the data file at public/questions.json. The structure includes:

- title
- categories (each with name, hint, and questions)
- finalJeopardy

Each question supports:

- value
- clue
- answer
- reference (optional)
- href (optional)

## Features

- Responsive Jeopardy board
- Clickable clues with answer reveal
- Mark questions as answered
- Final Jeopardy panel

## Development

- Install dependencies: npm install
- Start dev server: npm run dev
- Build for production: npm run build
