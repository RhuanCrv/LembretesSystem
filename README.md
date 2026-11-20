# Gerenciamento de Lembretes — Minimal API (.NET) + Front-end

Projeto desenvolvido para a disciplina de Programação III (UMFG), composto por uma Minimal API em .NET 8.0 integrada ao MySQL via Entity Framework Core e QuestPDF, e um front-end web em HTML, CSS e JavaScript puro.

---

## Resumo das Etapas do Projeto

### Etapa 1 — Compreender o Projeto
- **Estrutura do Front-end:**
  - `Front end/index.html`: Estrutura da interface com cabeçalho (`#btnImprimir`, `#btnNovo`), formulário de cadastro/edição (`#formulario`, `#formLembrete`, `#lembreteId`, `#descricao`, `#btnCancelar`), filtros (`#filtroDescricao`, datas de cadastro e atualização, `#tamanhoPagina`, `#btnLimparFiltros`, `#btnFiltrar`), listagem (`#totalRegistros`, `#listaLembretes`, `#mensagemVazia`), paginação (`#btnAnterior`, `#paginaAtual`, `#btnProximo`) e notificações (`#toast`).
  - `Front end/css/style.css`: Estilização do layout em cards, formulário, grade de filtros, tabela ordenável, badges de status, paginação, toast e regras responsivas.
  - `Front end/js/app.js`: Gerenciamento do estado (`paginaAtual`, `ordemAtual`, `direcaoAtual`), captura de elementos do DOM, eventos, chamadas assíncronas via `fetch` para `http://localhost:5207` e renderização da tela.
- **Endpoints da API (`Program.cs`):**
  - `POST /lembretes`: Cadastra um novo lembrete a partir do JSON enviado no corpo (`201 Created`).
  - `GET /lembretes`: Lista todos os lembretes ativos (`IsAtivo == true`) (`200 OK`).
  - `GET /lembretes/{id}`: Busca um lembrete ativo pelo `id` (`Guid`) (`200 OK`, `400 Bad Request` ou `404 Not Found`).
  - `GET /lembretes/filtro`: Consulta lembretes com filtros, ordenação e paginação via query string (`NumeroPagina`, `TamanhoPagina`, `Descricao`, `Ordem`, `Direcao`, `DataCadastroInicial`, `DataCadastroFinal`, `DataAtualizacaoInicial`, `DataAtualizacaoFinal`).
  - `GET /lembretes/imprimir`: Gera e retorna o arquivo `relatorio-lembretes.pdf` via QuestPDF aplicando os parâmetros de consulta.
  - `PUT /lembretes/{id}`: Atualiza a descrição e a data de atualização (`Update()`) via `LembreteDTO` (`200 OK` ou `404 Not Found`).
  - `DELETE /lembretes/{id}`: Realiza exclusão lógica (`SetAtivo(false)` e `Update()`) (`204 No Content` ou `404 Not Found`).
- **Comunicação JS ↔ API:** As funções assíncronas em `app.js` utilizam `fetch` com `async/await`, enviando `Content-Type: application/json` e `JSON.stringify(...)` nas operações de escrita (`POST` e `PUT`), `URLSearchParams` nas consultas filtradas/paginadas/impressão, `blob()` para download do PDF e `filtrarLembretes()` para atualizar a listagem após alterações.

### Etapa 2 — Testar as Requisições HTTP
- Validação prática das operações no navegador (com DevTools `F12` na aba **Network** / `Fetch/XHR`) contra a API em `http://localhost:5207`:
  - `GET` para listagem/filtro (`200`).
  - `POST` para cadastro de novo lembrete (`201`).
  - `GET /{id}` ao abrir um lembrete para edição (`200`).
  - `PUT /{id}` ao salvar alterações (`200`).
  - `DELETE /{id}` ao excluir um lembrete (`204`).

### Etapa 3 — Compreender o CORS
- O CORS (*Cross-Origin Resource Sharing*) controla requisições feitas pelo navegador entre origens diferentes (protocolo, domínio ou porta distintos).
- Como o front-end roda em origem diferente da API (`http://localhost:5207`), a política `"Frontend"` é registrada em `Program.cs` via `builder.Services.AddCors(...)` (`AllowAnyOrigin()`, `AllowAnyHeader()`, `AllowAnyMethod()`) e ativada com `app.UseCors("Frontend")`. Em produção, recomenda-se restringir com `WithOrigins(...)`.

### Etapa 4 — Personalizar a Estilização
- `Front end/css/style.css` estilizado com tema escuro, gradientes e acentos em roxo e azul, cards com bordas sutis, estados de foco/erro, indicadores de ordenação, badges de status e layout responsivo para telas menores.

### Etapa 5 — Implementar Filtros Completos
- Campos de `Descrição`, `Cadastro inicial`, `Cadastro final`, `Atualização inicial`, `Atualização final` e `Registros por página` integrados no `index.html` e enviados na query string pelo `app.js`, com suporte a `Enter`, botão **Filtrar** e botão **Limpar**.

### Etapa 6 — Implementar Paginação e Ordenação
- Paginação completa com `NumeroPagina` e `TamanhoPagina`, botões **← Anterior** e **Próxima →**, exibição do total de registros e da página atual.
- Ordenação interativa clicando nos cabeçalhos **Descrição**, **Cadastro** e **Atualização**, alternando `Ordem` e `Direcao` (`ASC` / `DESC`) com indicador visual na coluna ativa.

### Etapa 7 — Validar as Requisições
- Conferência detalhada na aba **Network** do navegador de método HTTP, URL, query string, headers (`Content-Type` e CORS), payload JSON (`POST`/`PUT`) e resposta da API.

### Etapa 8 — Tratamento de Erros e Usabilidade
- Exibição de mensagens de erro de comunicação com a API, aviso quando nenhum registro é encontrado, validação de campo obrigatório na descrição com feedback visual e notificações (`toast`) para sucesso, aviso, erro e informação.

### Etapa 9 — Testes Finais
- Verificação ponta a ponta de cadastro, consulta, edição, exclusão, filtros de texto e data, limpeza de filtros, paginação, ordenação por colunas e geração de PDF.

### Etapa 10 — Versionamento e Entrega
- Projeto organizado com as pastas `Api` e `Front end`, versionado e publicado em repositório público no GitHub (`LembretesSystem`) para envio do link na tarefa do AVA.
