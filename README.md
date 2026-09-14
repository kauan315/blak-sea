# Tidebreakers: Eclipse Sea

Tidebreakers is an original 3D survival action RPG. It is a standalone browser/PC prototype, not a Roblox Studio project.

The game combines an original power-combat loop with a survival island: hunger, thirst, stamina, hostile marauders, gathering, XP, shells, third-person exploration, dynamic daylight, fog, terrain, water, shadows, and local save data.

This is a clean-room project. It does not copy protected characters, maps, names, models, sounds, UI, or other assets from existing games. The visual goal is grounded, atmospheric survival realism while keeping fast anime-inspired powers readable in combat.

## Run the game

Requirements: Node.js 20+.

    cd game
    npm install
    npm run dev

Open the local URL printed by Vite. For a production check:

    npm run build

## Controls

- WASD: move
- Q: Emberwake, a focused fire wave
- E: Rift Current, a close-range water pull
- R: Stonebloom, a crystal shockwave
- F: gather a glowing wild fruit
- Left mouse: Emberwake

## Stack

- TypeScript for the game simulation and combat logic.
- Three.js/WebGL for the 3D world, lighting, materials, shadows, particles, and camera.
- HTML and CSS for the HUD.
- Vite for the development server and production build.
- LocalStorage for the first offline save layer.

## Current vertical slice

The first slice contains a procedural island, water, trees, rocks, a third-person character, five respawning marauders, three powers, survival meters, resource gathering, rewards, a day/night light cycle, and responsive combat feedback.

## Next production milestones

1. Replace procedural placeholder characters with original high-detail rigs and animation sets.
2. Add combo chains, dodge, guard break, hit reactions, enemy states, and a boss.
3. Add island streaming, quests, crafting, inventory, loot, and persistent profiles.
4. Add authored PBR materials, sound design, post-processing, accessibility, and performance budgets.
5. Package the browser build as a desktop app after the combat loop is stable.
