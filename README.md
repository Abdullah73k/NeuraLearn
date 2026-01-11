# NeuraLearn

**A voice-first, graph-based AI learning interface designed for cognitive accessibility.**

NeuraLearn reimagines how users interact with AI by replacing traditional linear chat interfaces with an infinite canvas mind map. Users can speak questions naturally, and the system intelligently routes them to the correct knowledge node, creates new nodes when needed, and responds with context-aware answers. Built with accessibility at its core, NeuraLearn reduces cognitive load through spatial organization, voice input/output, and visual relationship mapping.

---

## Problem Statement

Traditional AI chat interfaces present significant accessibility barriers:

1. **Linear conversation overload** – Users with dyslexia, ADHD, or working memory difficulties struggle to track long chat histories. Information gets buried in walls of text.

2. **Text-heavy interaction** – Users with visual impairments, reading difficulties, or motor disabilities face friction when typing and scanning dense responses.

3. **No structural context** – Standard chatbots treat every message as isolated. Users lose track of how topics relate, making research and learning fragmented.

4. **High cognitive demand** – Navigating back to earlier topics, remembering what was discussed, and synthesizing information across sessions requires significant mental effort.

These barriers exclude users who could benefit most from AI-assisted learning.

---

## Solution Overview

NeuraLearn addresses these challenges through three core design principles:

### 1. Graph-Based Knowledge Organization
Instead of a scrolling chat log, knowledge is organized as a visual mind map. Each topic becomes a node. Subtopics branch naturally. Users see relationships spatially, reducing the need to remember or search through text.

### 2. Voice-First Interaction
A global microphone allows users to speak questions from anywhere in the interface. The system transcribes speech, classifies intent, and routes the question to the appropriate node—or creates a new one. Text-to-speech reads responses aloud.

### 3. Semantic Memory with Vector Search
All nodes are embedded using Google's `text-embedding-004` model and stored in MongoDB Atlas with vector search. When users ask questions, the system finds semantically related existing nodes rather than creating duplicates.

---

## Key Accessibility Features

| Feature | Accessibility Benefit |
|---------|----------------------|
| **Global voice input (press G)** | Hands-free interaction for motor-impaired users |
| **Speech-to-text transcription** | ElevenLabs Scribe v2 for accurate voice capture |
| **Text-to-speech responses** | ElevenLabs Turbo v2.5 reads AI responses aloud |
| **Spatial mind map layout** | Reduces working memory load; visual learners see structure |
| **Auto-layout algorithm** | Organizes nodes hierarchically without manual arrangement |
| **Large, high-contrast nodes** | Circular and rounded-rectangle nodes with neon gradient borders for visibility |
| **Minimal text density** | Each node shows only its title; full chat opens on double-click |
| **Keyboard shortcut (G)** | Quick access to voice without mouse navigation |

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Next.js 16 Frontend                         │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │  InfinityBoard  │  │   ChatSidebar   │  │  WorkspacesSidebar  │  │
│  │   (ReactFlow)   │  │   (AI Chat UI)  │  │   (Workspaces)      │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────┬───────────┘  │
│           │                    │                     │              │
│  ┌────────┴────────────────────┴─────────────────────┴───────────┐  │
│  │                     Zustand Store (store.ts)                  │  │
│  │  - Workspaces, nodes, edges, messages, active selections      │  │
│  └───────────────────────────────┬───────────────────────────────┘  │
├──────────────────────────────────┼──────────────────────────────────┤
│                                  │                                  │
│  ┌───────────────────────────────┴───────────────────────────────┐  │
│  │                      GlobalMic Component                      │  │
│  │  - Records audio via MediaRecorder API                        │  │
│  │  - Sends to /api/transcribe (ElevenLabs STT)                  │  │
│  │  - Classifies command via /api/classify-command               │  │
│  │  - Routes question via /api/graph/route-question              │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API Routes (Server)                          │
├─────────────────────────────────────────────────────────────────────┤
│  /api/transcribe          → ElevenLabs Speech-to-Text               │
│  /api/text-to-speech      → ElevenLabs Text-to-Speech               │
│  /api/classify-command    → Gemini intent classification            │
│  /api/graph/route-question→ Semantic routing + Google Search        │
│  /api/chat/[nodeId]       → Streaming chat with Gemini 2.0 Flash    │
│  /api/graph/topics        → CRUD for root topics (workspaces)       │
│  /api/graph/nodes         → CRUD for nodes + vector embedding       │
│  /api/generate-note       → AI-generated note content               │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MongoDB Atlas (neuralearn DB)                    │
├─────────────────────────────────────────────────────────────────────┤
│  Collections:                                                       │
│  - root_topics    → Workspace metadata                              │
│  - nodes          → All graph nodes with 768-dim embeddings         │
│  - node_interactions → Chat history per node                        │
│                                                                     │
│  Vector Search Index: "vector_index" on nodes.embedding             │
│  (cosine similarity for semantic node matching)                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## AI and Model Stack

### Models Used

| Model | Provider | Purpose |
|-------|----------|---------|
| `gemini-2.0-flash` | Google AI | Primary chat model for all conversations |
| `gemini-2.0-flash-exp` | Google AI | Web search integration via Google Search tool |
| `text-embedding-004` | Google AI | 768-dimensional embeddings for semantic search |

### Vercel AI SDK Integration

NeuraLearn uses the Vercel AI SDK (`ai` package) for:
- **Streaming responses** via `streamText()` for real-time chat
- **Structured output** via `generateObject()` for command classification and routing
- **Tool integration** via `google.tools.googleSearch()` for real-time web search
- **UI message handling** via `useChat()` hook for React state management

### AI Features

1. **Intelligent Question Routing** – When a user asks a question via voice, the system:
   - Generates an embedding for the question
   - Performs vector search to find similar existing nodes
   - Uses Gemini to decide: route to existing node (score ≥ 0.85), create under related node (score ≥ 0.65), or create under root (score < 0.65)

2. **Context-Aware Chat** – Each node maintains its own conversation history. The AI receives the full context of the current node's topic and previous interactions.

3. **Dynamic Summary Generation** – After each chat interaction, the system generates an updated summary for the node and regenerates its embedding, improving future semantic search accuracy.

4. **Web Search Tool** – Users can enable Google Search for real-time information. The AI receives search results and cites sources.

---

## Voice and Audio Accessibility

### Speech-to-Text (Input)

- **Provider**: ElevenLabs Scribe v2
- **Endpoint**: `/api/transcribe`
- **Flow**: User presses G or clicks mic → MediaRecorder captures WebM audio → Sent to ElevenLabs → Returns transcription
- **Use case**: Completely hands-free question asking

### Text-to-Speech (Output)

- **Provider**: ElevenLabs Turbo v2.5
- **Endpoint**: `/api/text-to-speech`
- **Voice**: Rachel (natural female voice)
- **Use case**: AI responses can be read aloud for users with reading difficulties

### Voice Command Classification

The `/api/classify-command` endpoint uses Gemini to classify spoken input into:
- `create_node` – Create a new subtopic
- `delete_node` – Remove a node
- `navigate_to` – Go to an existing node
- `create_note` – Add a personal note to a node
- `question` – Ask the AI about a topic

This allows natural language commands like:
- "Create a node about derivatives from calculus"
- "Add a note to the physics node saying remember to review momentum"
- "What is machine learning?"

---

## Data and Memory Layer

### MongoDB Collections

**root_topics**
```typescript
{
  id: string,           // UUID
  title: string,        // Workspace name
  description: string,  // Brief description
  node_count: number,   // Number of nodes in workspace
  created_at: Date
}
```

**nodes**
```typescript
{
  id: string,
  title: string,
  summary: string,           // AI-generated summary
  parent_id: string | null,  // null for root nodes
  root_id: string,           // Workspace this belongs to
  tags: string[],
  embedding: number[],       // 768-dim vector
  children_ids: string[],
  ancestor_path: string[],   // Full path from root
  position: { x, y },        // Canvas position
  interaction_count: number,
  last_refined_at: Date,
  created_at: Date
}
```

**node_interactions**
```typescript
{
  node_id: string,
  user_message: string,
  ai_response: string,
  timestamp: Date
}
```

### Vector Search

MongoDB Atlas Vector Search is configured with:
- **Index name**: `vector_index`
- **Dimensions**: 768 (Google text-embedding-004)
- **Similarity**: Cosine
- **Filter**: Scoped to `root_id` for workspace isolation

When users ask questions, the system:
1. Generates an embedding for the query
2. Searches for similar nodes within the current workspace
3. Returns nodes with similarity scores for routing decisions

---

## Why a Graph-Based Interface Matters

### Cognitive Load Reduction

Research in cognitive psychology shows that spatial organization reduces working memory demands. When information is arranged visually with clear parent-child relationships:

- Users spend less effort remembering "where was that topic?"
- Related concepts are physically proximate
- The brain can offload memory to the visual structure

### Accessibility for Neurodivergent Users

Users with ADHD, dyslexia, or autism often benefit from:
- **Visual structure** over linear text
- **Chunked information** in discrete nodes rather than paragraphs
- **Flexible navigation** allowing non-linear exploration
- **Reduced scanning** since each node shows only its title

### Research and Learning Workflow

Traditional chat forces users to scroll and re-read to find earlier context. NeuraLearn's graph structure means:
- Users can see all explored topics at once
- New questions are routed to existing nodes, not lost in scroll
- Notes can be attached to specific concepts
- The structure itself becomes a study artifact

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI Library | React 19 |
| State Management | Zustand (with persist middleware) |
| Graph Visualization | React Flow (@xyflow/react) |
| AI SDK | Vercel AI SDK (`ai`, `@ai-sdk/google`) |
| LLM | Google Gemini 2.0 Flash |
| Embeddings | Google text-embedding-004 (768 dim) |
| Database | MongoDB Atlas |
| Vector Search | MongoDB Atlas Vector Search |
| Speech-to-Text | ElevenLabs Scribe v2 |
| Text-to-Speech | ElevenLabs Turbo v2.5 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui, Radix UI |
| Animation | Motion (Framer Motion) |

---

## How to Run Locally

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- MongoDB Atlas account with Vector Search enabled
- Google AI API key
- ElevenLabs API key

### Environment Variables

Create `.env.local`:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/
GOOGLE_GENERATIVE_AI_API_KEY=your-google-ai-key
NEXT_PUBLIC_ELEVENLABS_API_KEY=your-elevenlabs-key
```

### MongoDB Atlas Vector Search Setup

In MongoDB Atlas, create a search index on the `nodes` collection:

```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embedding": {
        "dimensions": 768,
        "similarity": "cosine",
        "type": "knnVector"
      }
    }
  }
}
```

Name the index: `vector_index`

### Installation

```bash
# Clone the repository
git clone https://github.com/Abdullah73k/neuraLearn.git
cd neuraLearn

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Usage

1. Click **Add Workspace** to create a new knowledge graph
2. Double-click a node to open its chat
3. Press **G** or click the microphone to ask questions by voice
4. Enable **Search** toggle for real-time web results
5. Use voice commands like "Create a node about X from Y"

---

## Future Improvements

- **Offline support** – Cache embeddings locally for offline semantic search
- **Collaborative workspaces** – Real-time multi-user editing
- **Export options** – Export graphs as Markdown, PDF, or Anki flashcards
- **Accessibility audit** – WCAG 2.1 AA compliance testing
- **Mobile app** – React Native version with voice-first design
- **Multiple LLM providers** – Support for OpenAI, Anthropic, local models
- **Node summaries read aloud** – TTS for node content on hover
- **Dyslexia-friendly fonts** – OpenDyslexic font toggle

---

## DeltaHacks XII

NeuraLearn was built in 24 hours for **DeltaHacks XII** at McMaster University.

**Theme**: Accessibility in AI Interaction

**Team Focus**: Making AI-powered learning accessible to users with cognitive, visual, and motor disabilities through voice-first design and spatial knowledge organization.

---

## License

MIT License – See [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [Vercel AI SDK](https://sdk.vercel.ai/) for seamless AI integration
- [React Flow](https://reactflow.dev/) for the graph canvas
- [ElevenLabs](https://elevenlabs.io/) for voice synthesis
- [MongoDB Atlas](https://www.mongodb.com/atlas) for vector search
- [shadcn/ui](https://ui.shadcn.com/) for accessible components
