# macOS / Linux Setup

Install Ollama using the official installer, then:
```bash
ollama pull qwen3:4b
npm install
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

To run without local AI:
```bash
OLLAMA_ENABLED=false npm run dev
```
