# ProcessGuide AI

Este repositório contém um sistema de gestão de processos empresariais com front-end React/Vite e back-end FastAPI. O projeto integra:

- Backend em Python com **FastAPI** e **SQLAlchemy**
- Banco de dados SQLite por padrão
- Serviços de RAG/IA com **LangChain** e **Google Gemini**
- Front-end em **React** com **Vite**, **Tailwind CSS** e **Zustand**
- Upload de documentos PDF/DOCX/MD/TXT e geração automática de fluxos de processo
- Histórico e controle de versões de processos
- Exportação de processos para `.docx`



<img width="2816" height="1536" alt="Projeto diagramas" src="https://github.com/user-attachments/assets/6b151b9f-737a-430a-a24a-35fcd6b038ab" />


---

## Arquitetura técnica

### Backend

O backend está em `backend/` e é composto por:

- `backend/main.py`
  - Cria a aplicação `FastAPI`
  - Configura CORS para permitir requisições do front-end
  - Registra routers: `/api/processes`, `/api/versions`, `/api/documents`, `/api/ai`
  - Executa migrações leves em startup e popula workspaces padrão

- `backend/database/db.py`
  - Usa `SQLAlchemy` com `sqlite:///./processguide.db` por padrão
  - Define modelos:
    - `Workspace`: espaços de trabalho com nome e ícone
    - `Process`: processos com fluxo JSON, setor, documento fonte e histórico de atualização
    - `Version`: versões publicadas do processo
    - `Document`: documentos importados e texto extraído

- `backend/routers/`
  - `processes.py`: CRUD de processos e workspaces
  - `versions.py`: publicação, listagem e restauração de versões
  - `documents.py`: upload, listagem, leitura, exclusão e exportação `.docx`
  - `ai_router.py`: chat IA, geração de fluxo, diff de documentos e sugestão de SOP para nó

- `backend/services/`
  - `rag_service.py`: RAG com Chroma + embeddings + Gemini
  - `graph_service.py`: converte texto em fluxo JSON, compara documentos com o fluxo atual e sugere descrição/SOP de etapas
  - `export_service.py`: exporta `flow_json` para arquivo `.docx` usando apenas Python stdlib

### Frontend

O frontend está em `frontend/`.

- `frontend/package.json`: Vite, React, Tailwind e Zustand
- `frontend/vite.config.js`: proxy de `/api` para `http://localhost:8000`
- `frontend/src/App.jsx`: layout principal em três áreas: sidebar esquerda, canvas central e sidebar direita
- `frontend/src/store/useStore.js`: estado global com processos, fluxos, chat, histórico de atividades e integração com API

### Como o front se integra com o back

- O front acessa a API em `http://localhost:8000/api`
- Endpoints principais:
  - `GET /api/processes/` - lista processos
  - `GET /api/processes/{id}` - carrega fluxo JSON
  - `PUT /api/processes/{id}` - salva fluxo atualizado
  - `POST /api/documents/upload` - upload de documento e extração de texto
  - `POST /api/ai/generate-flow` - gerar diagrama de processo da IA
  - `POST /api/ai/diff` - comparar documento com fluxo atual
  - `POST /api/versions/publish` - publicar versão do processo

### Pipeline técnico

1. `frontend` usa `@xyflow/react` e React Flow para renderizar o grafo de processo como `nodes` e `edges`.
2. O estado do fluxo e ações do usuário são gerenciados em `frontend/src/store/useStore.js`.
3. As mudanças e ações de geração são enviadas para o backend FastAPI em `/api/*`.
4. O backend lê o texto importado em `backend/routers/documents.py`, extrai conteúdo e persiste em SQLite.
5. `backend/services/graph_service.py` chama Gemini via `langchain-google-genai` para transformar texto em JSON de fluxo React Flow ou gerar diffs/SOPs.
6. `backend/services/rag_service.py` busca contexto em ChromaDB usando embeddings do Google e envia prompts ao Gemini para respostas de chat.
7. O resultado da IA retorna para o frontend e é renderizado novamente via React Flow, mantendo o fluxo atualizado.

> Resumindo: React Flow no frontend visualiza o processo, FastAPI orquestra a API, LangChain/Gemini gera e analiza processos, e ChromaDB/SQLite guarda contexto, documentos e fluxo.

---

## Como rodar o projeto

### 1. Backend

1. Abra o terminal em `backend/`
2. Ative o ambiente virtual Python:
   - PowerShell: `..\Gitdoc\Scripts\Activate.ps1`
   - CMD: `..\Gitdoc\Scripts\activate.bat`
3. Instale dependências:
   - `pip install -r requirements.txt`
4. Crie um arquivo `.env` em `backend/` ou defina variáveis de ambiente:
   ```env
   DATABASE_URL=sqlite:///./processguide.db
   GOOGLE_API_KEY=<sua_chave_google_gemini>
   CHROMA_PERSIST_DIR=./chroma_db
   CORS_ORIGINS=http://localhost:5173,http://localhost:3000
   ```
5. Rode a aplicação:
   - `python -m uvicorn main:app --reload --port 8000`
6. Verifique se o backend está ativo em:
   - `http://localhost:8000`
   - Documentação OpenAPI: `http://localhost:8000/docs`

### 2. Frontend

1. Abra outro terminal em `frontend/`
2. Instale dependências:
   - `npm install`
3. Inicie o servidor de desenvolvimento:
   - `npm run dev`
4. Acesse a aplicação em:
   - `http://localhost:5173`

### 3. Fluxo esperado

1. Inicie backend e frontend.
2. Acesse a UI no navegador.
3. Crie um workspace/processo ou selecione um processo existente.
4. Importe um documento (`PDF`, `DOCX`, `MD`, `TXT`).
5. Use **Gerar Diagrama com IA** para transformar texto em fluxo.
6. Visualize, edite e salve o fluxo.
7. Publique versões e exporte para `.docx`.

---

## Dependências importantes

### Backend

- `fastapi` - servidor web e rotas
- `uvicorn[standard]` - servidor ASGI
- `sqlalchemy` - ORM
- `pydantic` / `pydantic-settings` - validação e schemas
- `chromadb` - banco de vetores local
- `langchain` e `langchain-google-genai` - integração LLM
- `google-generativeai` - acesso ao Gemini
- `pypdf`, `python-docx`, `markdown` - extração de documentos
- `python-dotenv` - carregamento de variáveis de ambiente

### Frontend

- `react`, `react-dom`
- `vite`
- `@vitejs/plugin-react`
- `tailwindcss`, `postcss`
- `zustand` - estado global
- `lucide-react` - ícones
- `@xyflow/react` - componentes de fluxo e canvas
- `html-to-image` - exportação de canvas/diagramas

---

## Componentes técnicos principais

### Banco de dados e modelos

- `Workspace`: divisão de processos por área / departamento
- `Process`: mantém `flow_json` como string JSON
- `Version`: guarda histórico de versões do processo
- `Document`: armazena texto extraído para uso em RAG e geração de fluxo

### IA e RAG

- `RagService.query()` usa:
  - embeddins Google generative AI
  - `Chroma` para buscar contexto relevante em documentos
  - prompt dinâmico para responder perguntas sobre processos
- `GraphService.text_to_flow()` usa um prompt para gerar JSON de grafo React Flow
- `GraphService.diff_flow()` detecta diferenças entre documento e fluxo atual
- `GraphService.suggest_node_sop()` cria um SOP para uma etapa de processo

### Exportação

- `export_service.py` monta arquivos `.docx` diretamente com XML OOXML
- Não precisa de `python-docx` para gerar `.docx` desse fluxo

---

## Configuração avançada

- `DATABASE_URL`: permite usar outro banco, por exemplo `sqlite:///./processguide.db` ou `postgresql://...`
- `CHROMA_PERSIST_DIR`: pasta local para vetores Chroma
- `CORS_ORIGINS`: origens autorizadas para o frontend
- `GOOGLE_API_KEY`: chave obrigatória para IA

## Pontos críticos para rodar corretamente

- A IA depende de `GOOGLE_API_KEY`. Sem ela, os endpoints `/api/ai/*` e geração de fluxo falham.
- O proxy Vite (`frontend/vite.config.js`) redireciona `/api` ao backend em `localhost:8000`.
- O backend cria o banco e popula workspaces no início via `Base.metadata.create_all()`.
- Documentos são extraídos para texto em `documents.py` e apenas extensões suportadas são aceitas.

---

## Sugestões de uso

- Importe o documento original do processo para alimentar a IA.
- Use a geração de fluxo IA para criar uma primeira versão do diagrama.
- Compare novas versões de documentos com o fluxo atual para detectar divergências.
- Publique versões para manter histórico e permitir restauração.

---

## Estrutura de pastas

- `backend/`: aplicação Python, banco e APIs
- `backend/database/`: configurações de engine, models e sessão
- `backend/models/`: schemas Pydantic
- `backend/routers/`: endpoints REST
- `backend/services/`: lógica de IA, exportação e processamento de grafos
- `frontend/`: interface React/Vite
- `frontend/src/`: código React, estilos e estado global
- `frontend/src/store/`: store Zustand e integração com API

---

## Como ligar o projeto rapidamente

1. `cd backend`
2. `pip install -r requirements.txt`
3. `python -m uvicorn main:app --reload --port 8000`
4. `cd ../frontend`
5. `npm install`
6. `npm run dev`
7. Abrir `http://localhost:5173`

---

## Observação

O projeto foi desenhado para ser um gerador e editor de processos orientado por IA, com armazenamento local e uso de prompts em português. Se precisar, posso também gerar um `docker-compose.yml` para rodar backend e frontend juntos em containers.
