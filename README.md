# MST Visualizer 🚀

A premium, interactive web application for visualizing Minimum Spanning Tree (MST) algorithms. This tool provides a step-by-step simulation of **Kruskal's** and **Prim's** algorithms, complete with code highlighting and internal state tracking.

![MST Visualizer Preview](https://via.placeholder.com/800x450.png?text=MST+Visualizer+Preview) <!-- You can replace this with a real screenshot later -->

## ✨ Features

- **Algorithm Simulations**:
  - **Kruskal's Algorithm**: Visualizes edge sorting and Disjoint Set Union (DSU) operations.
  - **Prim's Algorithm**: Visualizes node exploration and priority queue selection.
- **Interactive Graph**:
  - Add, edit, or delete nodes and edges in real-time.
  - Drag-and-drop node positioning.
  - Interactive edge selection for detailed weight information.
- **Visual Debugging**:
  - **Code Highlighting**: See which line of the algorithm is currently executing.
  - **Internal State**: Monitor DSU parent pointers or Visited sets live.
  - **Terminal Output**: Real-time logs of algorithm decisions.
- **Comparison Mode**: Run both algorithms side-by-side to compare performance and steps.
- **Playback Controls**: Adjust simulation speed (Slow/Medium/Fast) and step through manually or automatically.
- **Premium UI**: Sleek, dark-themed interface built with a focus on developer experience.

## 🛠️ Tech Stack

- **Framework**: React.js
- **Visualization**: Cytoscape.js
- **Styling**: Vanilla CSS (Inline)
- **Typography**: JetBrains Mono (for that terminal feel)

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/spsneh07/mst-simulation.git
   cd mst-simulation
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The application will be available at `http://localhost:3000`.

## 📖 How to Use

1. **Modify the Graph**: Use the table at the bottom left to add custom edges or edit existing weights.
2. **Select an Algorithm**: Click on "C Sim (Kruskal)" or "C++ Sim (Prim)" to load the simulation.
3. **Control Playback**: Use the Play/Pause buttons or the "Step" button to progress through the algorithm.
4. **Compare**: Toggle "Compare Algorithms" to see how both approaches solve the same graph simultaneously.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
