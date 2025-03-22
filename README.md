<<<<<<< HEAD
# defend_the_castle
Browser Game made with ThreeJS
=======
# Defend The Castle

A third-person action tower defense game built with Three.js where players control a character defending their castle against waves of enemies.

## Features

- Third-person character control
- Wave-based enemy spawning system
- Castle defense mechanics
- Tower placement and management
- Hero abilities and combat system
- Dynamic difficulty scaling

## Tech Stack

- Three.js for 3D rendering
- Cannon.js for physics
- React for UI components
- Webpack for bundling
- ESLint/Prettier for code quality

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/defend-the-castle.git
cd defend-the-castle
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Build for production:
```bash
npm run build
```

## Controls

- W: Move forward
- S: Move backward
- A: Rotate left
- D: Rotate right
- Space: Attack
- Mouse: Look around (coming soon)

## Project Structure

```
src/
  ├── assets/               # Game models, textures, and animations
  ├── components/           # Reusable game entities
  ├── game/                 # Core game logic
  ├── hero/                 # Player character code
  ├── ui/                   # UI components
  ├── utils/                # Utility functions
  ├── scenes/               # Three.js scenes
  ├── systems/              # Game systems
  └── main.js               # Entry point
```

## Development

### Code Style

This project uses ESLint and Prettier for code formatting. To format your code:

```bash
npm run format
```

To check for linting errors:

```bash
npm run lint
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
>>>>>>> master
