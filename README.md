# Mitthu - Virtual Desktop Pet

Mitthu is an interactive virtual desktop pet that lives on your screen. Similar to Comnyang, Mitthu reacts dynamically to your keyboard and mouse movements, providing a delightful and engaging companion as you work.

## Features

- **Interactive Companion:** Reacts to your keystrokes and mouse pointer.
- **Dynamic Animations:** Performs various actions based on your activity (e.g., typing speed, mouse movements, idle time).
- **Overlays:** Includes useful features like a Pomodoro Timer, Speech Bubbles, and a Mini Keyboard visualization.
- **Customizable:** Built with React and Vite for easy modification and expansion.

## Project Structure

- `public/`: Static assets including pixel art sprites and audio files.
- `src/components/`: Core visual components and overlays.
- `src/hooks/`: Custom React hooks managing the pet's logic (idle tracking, typing speed, drag physics).
- `src/services/`: Background workers and websocket connections for advanced interactions.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
