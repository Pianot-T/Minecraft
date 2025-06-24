# Minecraft Demo

This project provides a small 3D sandbox demo built with [Three.js](https://threejs.org/).

## Features
- Simple terrain made of grey blocks with a flat bottom layer.
- Random mountains and valleys generated with Perlin noise.
- Green rectangular player with gravity and collision.
- Switch between first and third person using the `A` key.
- Movement with `Z`, `Q`, `S`, `D` and jump with space.
- Press `Escape` to open the menu where you can adjust render distance and resume with the **Sauvegarder** button.
- Chunks are loaded and unloaded around the player based on the selected render distance.
- Game state (player position, seed and render distance) is saved to `localStorage` when you click **Sauvegarder**.

## Running
Open `index.html` in a modern web browser that supports WebGL. Click on the page to lock the pointer and start moving.
