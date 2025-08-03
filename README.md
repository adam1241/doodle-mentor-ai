# Doodle Mentor AI

An AI-powered digital notebook and learning companion designed to help students solve problems through interactive drawing and personalized tutoring.

## What is Doodle Mentor AI?

Doodle Mentor AI is an educational web application that combines the power of digital drawing with AI tutoring to create an engaging learning experience. Students can upload exercise images, draw solutions on an infinite canvas, and receive step-by-step guidance from an AI tutor with different personality modes.

## Key Features

### 🎨 **Digital Drawing Canvas**
- Infinite canvas with grid pattern for organized note-taking
- Multiple drawing tools (pencil, shapes, erasers)
- Customizable brush sizes and colors
- Export capabilities for saving work

### 🤖 **AI Chat Tutor**
- Interactive AI assistant that helps solve problems step-by-step
- Multiple personality modes: Calm, Angry, Cool, and Lazy
- Contextual feedback and learning guidance
- Problem analysis and solution suggestions

### 📸 **Image Upload & Analysis**
- Upload exercise images or problem statements
- AI can analyze uploaded content
- Integration between uploaded materials and drawing canvas

### 🎯 **Learning-Focused Design**
- Clean, distraction-free interface
- Responsive design for various devices
- Modern UI components for intuitive interaction

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **UI Framework**: Tailwind CSS + shadcn/ui components
- **Drawing Engine**: Fabric.js for canvas functionality
- **Build Tool**: Vite
- **State Management**: React Query for server state
- **Routing**: React Router

## Getting Started

### Prerequisites
- Node.js (recommended: use nvm)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd doodle-mentor-ai

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## How It Works

1. **Upload**: Students upload an exercise image or problem statement
2. **Draw**: Use the digital canvas to work through the problem, make diagrams, or take notes
3. **Chat**: Interact with the AI tutor for guidance, explanations, and feedback
4. **Learn**: Receive personalized assistance based on the selected AI personality mode

## AI Personality Modes

- **Calm**: Patient and encouraging, perfect for building confidence
- **Angry**: Direct and challenging, pushes students to think harder
- **Cool**: Laid-back and casual, makes learning feel effortless
- **Lazy**: Minimal effort approach, focuses on shortcuts and efficiency

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── AIChat.tsx      # AI chat interface
│   ├── DrawingCanvas.tsx # Digital drawing canvas
│   ├── ImageUpload.tsx # Image upload functionality
│   └── PersonalitySelector.tsx # AI personality selection
├── pages/              # Application pages
├── hooks/              # Custom React hooks
└── lib/                # Utility functions
```

## Contributing

This project is built with modern web technologies and follows React best practices. Contributions are welcome!

## License

This project was generated using Lovable and is intended for educational purposes.