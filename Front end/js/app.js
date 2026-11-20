// ========================================
// CONFIGURAÇÃO E ESTADO
// ========================================

const API_URL = "http://localhost:5207";

let paginaAtual = 1;
let ordemAtual = "DataCadastro";
let direcaoAtual = "DESC";


// ========================================
// ELEMENTOS DA PÁGINA
// ========================================

const formulario = document.getElementById("formulario");
const formLembrete = document.getElementById("formLembrete");

const lembreteId = document.getElementById("lembreteId");
const descricao = document.getElementById("descricao");
const erroDescricao = document.getElementById("erroDescricao");

const listaLembretes = document.getElementById("listaLembretes");
const mensagemVazia = document.getElementById("mensagemVazia");

const filtroDescricao = document.getElementById("filtroDescricao");
const dataCadastroInicial = document.getElementById("dataCadastroInicial");
const dataCadastroFinal = document.getElementById("dataCadastroFinal");
const dataAtualizacaoInicial = document.getElementById("dataAtualizacaoInicial");
const dataAtualizacaoFinal = document.getElementById("dataAtualizacaoFinal");
const tamanhoPagina = document.getElementById("tamanhoPagina");

const totalRegistros = document.getElementById("totalRegistros");
const paginaAtualElemento = document.getElementById("paginaAtual");

const btnImprimir = document.getElementById("btnImprimir");
const btnNovo = document.getElementById("btnNovo");
const btnCancelar = document.getElementById("btnCancelar");
const btnFiltrar = document.getElementById("btnFiltrar");
const btnLimparFiltros = document.getElementById("btnLimparFiltros");

const btnAnterior = document.getElementById("btnAnterior");
const btnProximo = document.getElementById("btnProximo");

const tituloFormulario = document.getElementById("tituloFormulario");
const colunasOrdenaveis = document.querySelectorAll("th.sortable");


// ========================================
// INICIALIZAÇÃO
// ========================================

document.addEventListener("DOMContentLoaded", () => {
    atualizarIndicadoresOrdenacao();
    filtrarLembretes();
});


// ========================================
// MONTAGEM DE PARÂMETROS (FILTROS, ORDEM, PÁGINA)
// ========================================

function obterDataHojeFormatada() {
    const dataAtual = new Date();
    return (
        dataAtual.getFullYear() +
        "-" +
        String(dataAtual.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(dataAtual.getDate()).padStart(2, "0")
    );
}

function montarParametrosConsulta() {
    const hoje = obterDataHojeFormatada();
    const params = new URLSearchParams();

    params.append("NumeroPagina", paginaAtual);
    params.append("TamanhoPagina", tamanhoPagina.value);
    params.append("Descricao", filtroDescricao.value.trim());
    params.append("Ordem", ordemAtual);
    params.append("Direcao", direcaoAtual);

    // Envia a data selecionada ou a data atual como padrão para evitar falha de binding (400) no DTO
    params.append("DataCadastroInicial", dataCadastroInicial.value || hoje);
    params.append("DataCadastroFinal", dataCadastroFinal.value || hoje);
    params.append("DataAtualizacaoInicial", dataAtualizacaoInicial.value || hoje);
    params.append("DataAtualizacaoFinal", dataAtualizacaoFinal.value || hoje);

    return params;
}


// ========================================
// GET /lembretes/filtro
// ========================================

async function filtrarLembretes() {
    try {
        const params = montarParametrosConsulta();

        const response = await fetch(`${API_URL}/lembretes/filtro?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`Falha na API ao consultar lembretes (HTTP ${response.status}).`);
        }

        const resultado = await response.json();
        const lembretes = resultado.lembretes ?? resultado.Lembretes ?? [];
        const total = resultado.total ?? resultado.Total ?? 0;
        const pagina = resultado.numeroPagina ?? resultado.NumeroPagina ?? paginaAtual;
        const tamPagina = resultado.tamanhoPagina ?? resultado.TamanhoPagina ?? Number(tamanhoPagina.value);

        renderizarLembretes(lembretes);

        totalRegistros.textContent = `${total} ${total === 1 ? "registro" : "registros"}`;
        paginaAtualElemento.textContent = `Página ${pagina}`;

        btnAnterior.disabled = pagina <= 1;
        btnProximo.disabled = pagina * tamPagina >= total;
    } catch (error) {
        console.error(error);
        listaLembretes.innerHTML = "";
        mensagemVazia.textContent = "Não foi possível carregar os lembretes. Verifique a conexão com a API.";
        mensagemVazia.classList.remove("hidden");
        totalRegistros.textContent = "0 registros";
        btnAnterior.disabled = true;
        btnProximo.disabled = true;

        mostrarToast("Erro de comunicação com a API ao buscar lembretes.", "error");
    }
}


// ========================================
// GET /lembretes/imprimir
// ========================================

async function imprimirLembretes() {
    try {
        const params = montarParametrosConsulta();
        const response = await fetch(`${API_URL}/lembretes/imprimir?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`Falha ao gerar PDF (HTTP ${response.status}).`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "relatorio-lembretes.pdf";

        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => URL.revokeObjectURL(url), 10000);
        mostrarToast("Relatório PDF gerado com sucesso!", "success");
    } catch (error) {
        console.error(error);
        mostrarToast("Erro ao gerar o relatório em PDF.", "error");
    }
}


// ========================================
// POST /lembretes
// ========================================

async function criarLembrete() {
    try {
        const dados = {
            descricao: descricao.value.trim()
        };

        const response = await fetch(`${API_URL}/lembretes`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dados)
        });

        if (!response.ok) {
            throw new Error(`Erro ao criar lembrete (HTTP ${response.status}).`);
        }

        mostrarToast("Lembrete criado com sucesso!", "success");
        fecharFormulario();
        paginaAtual = 1;
        await filtrarLembretes();
    } catch (error) {
        console.error(error);
        mostrarToast("Não foi possível criar o lembrete. Tente novamente.", "error");
    }
}


// ========================================
// GET /lembretes/{id}
// ========================================

async function buscarLembrete(id) {
    try {
        const response = await fetch(`${API_URL}/lembretes/${id}`);

        if (!response.ok) {
            throw new Error(`Lembrete não encontrado (HTTP ${response.status}).`);
        }

        const lembrete = await response.json();

        limparErroCampo();
        lembreteId.value = lembrete.id ?? lembrete.Id ?? "";
        descricao.value = lembrete.descricao ?? lembrete.Descricao ?? "";

        tituloFormulario.textContent = "Editar lembrete";
        formulario.classList.remove("hidden");
        descricao.focus();
    } catch (error) {
        console.error(error);
        mostrarToast("Não foi possível buscar o lembrete selecionado.", "error");
    }
}


// ========================================
// PUT /lembretes/{id}
// ========================================

async function atualizarLembrete() {
    try {
        const dados = {
            descricao: descricao.value.trim()
        };

        const response = await fetch(`${API_URL}/lembretes/${lembreteId.value}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dados)
        });

        if (!response.ok) {
            throw new Error(`Erro ao atualizar lembrete (HTTP ${response.status}).`);
        }

        mostrarToast("Lembrete atualizado com sucesso!", "success");
        fecharFormulario();
        await filtrarLembretes();
    } catch (error) {
        console.error(error);
        mostrarToast("Não foi possível atualizar o lembrete.", "error");
    }
}


// ========================================
// DELETE /lembretes/{id}
// ========================================

async function excluirLembrete(id) {
    const confirmou = confirm("Deseja realmente excluir este lembrete?");

    if (!confirmou) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/lembretes/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error(`Erro ao excluir lembrete (HTTP ${response.status}).`);
        }

        mostrarToast("Lembrete excluído com sucesso!", "success");
        await filtrarLembretes();
    } catch (error) {
        console.error(error);
        mostrarToast("Não foi possível excluir o lembrete.", "error");
    }
}


// ========================================
// RENDERIZAÇÃO
// ========================================

function renderizarLembretes(lembretes) {
    listaLembretes.innerHTML = "";

    if (!lembretes || lembretes.length === 0) {
        mensagemVazia.textContent = "Nenhum lembrete encontrado para os critérios informados.";
        mensagemVazia.classList.remove("hidden");
        return;
    }

    mensagemVazia.classList.add("hidden");

    lembretes.forEach(item => {
        const id = item.id ?? item.Id;
        const desc = item.descricao ?? item.Descricao ?? "";
        const dtCadastro = item.dataCadastro ?? item.DataCadastro;
        const dtAtualizacao = item.dataAtualizacao ?? item.DataAtualizacao;
        const ativo = item.isAtivo ?? item.IsAtivo ?? true;

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${escaparHtml(desc)}</td>
            <td>${formatarData(dtCadastro)}</td>
            <td>${formatarData(dtAtualizacao)}</td>
            <td>
                <span class="status ${ativo ? "status-ativo" : "status-inativo"}">
                    ${ativo ? "Ativo" : "Inativo"}
                </span>
            </td>
            <td>
                <div class="actions">
                    <button
                        type="button"
                        class="btn btn-edit"
                        onclick="buscarLembrete('${id}')">
                        Editar
                    </button>

                    <button
                        type="button"
                        class="btn btn-danger"
                        onclick="excluirLembrete('${id}')">
                        Excluir
                    </button>
                </div>
            </td>
        `;

        listaLembretes.appendChild(tr);
    });
}


// ========================================
// FORMULÁRIO E VALIDAÇÃO
// ========================================

btnImprimir.addEventListener("click", () => {
    imprimirLembretes();
});

btnNovo.addEventListener("click", () => {
    abrirFormularioNovo();
});

btnCancelar.addEventListener("click", () => {
    fecharFormulario();
});

descricao.addEventListener("input", () => {
    if (descricao.value.trim()) {
        limparErroCampo();
    }
});

formLembrete.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!descricao.value.trim()) {
        erroDescricao.classList.remove("hidden");
        descricao.classList.add("input-error");
        descricao.focus();
        mostrarToast("Preencha a descrição antes de salvar.", "warning");
        return;
    }

    limparErroCampo();

    if (lembreteId.value) {
        await atualizarLembrete();
    } else {
        await criarLembrete();
    }
});

function abrirFormularioNovo() {
    lembreteId.value = "";
    descricao.value = "";
    limparErroCampo();

    tituloFormulario.textContent = "Novo lembrete";
    formulario.classList.remove("hidden");
    descricao.focus();
}

function fecharFormulario() {
    formulario.classList.add("hidden");
    formLembrete.reset();
    lembreteId.value = "";
    limparErroCampo();
}

function limparErroCampo() {
    erroDescricao.classList.add("hidden");
    descricao.classList.remove("input-error");
}


// ========================================
// FILTROS, ORDENAÇÃO E PAGINAÇÃO
// ========================================

btnFiltrar.addEventListener("click", () => {
    paginaAtual = 1;
    filtrarLembretes();
});

btnLimparFiltros.addEventListener("click", () => {
    filtroDescricao.value = "";
    dataCadastroInicial.value = "";
    dataCadastroFinal.value = "";
    dataAtualizacaoInicial.value = "";
    dataAtualizacaoFinal.value = "";
    tamanhoPagina.value = "10";
    ordemAtual = "DataCadastro";
    direcaoAtual = "DESC";
    paginaAtual = 1;

    atualizarIndicadoresOrdenacao();
    filtrarLembretes();
    mostrarToast("Filtros limpos.", "info");
});

filtroDescricao.addEventListener("keyup", event => {
    if (event.key === "Enter") {
        paginaAtual = 1;
        filtrarLembretes();
    }
});

tamanhoPagina.addEventListener("change", () => {
    paginaAtual = 1;
    filtrarLembretes();
});

colunasOrdenaveis.forEach(coluna => {
    coluna.addEventListener("click", () => {
        const campoSelecionado = coluna.dataset.ordem;

        if (ordemAtual === campoSelecionado) {
            direcaoAtual = direcaoAtual === "ASC" ? "DESC" : "ASC";
        } else {
            ordemAtual = campoSelecionado;
            direcaoAtual = "ASC";
        }

        paginaAtual = 1;
        atualizarIndicadoresOrdenacao();
        filtrarLembretes();
    });
});

function atualizarIndicadoresOrdenacao() {
    colunasOrdenaveis.forEach(coluna => {
        const campo = coluna.dataset.ordem;
        const indicador = document.getElementById(`sort-${campo}`);
        coluna.classList.remove("sorted");

        if (indicador) {
            if (campo === ordemAtual) {
                coluna.classList.add("sorted");
                indicador.textContent = direcaoAtual === "ASC" ? "▲" : "▼";
            } else {
                indicador.textContent = "⇅";
            }
        }
    });
}

btnAnterior.addEventListener("click", () => {
    if (paginaAtual > 1) {
        paginaAtual--;
        filtrarLembretes();
    }
});

btnProximo.addEventListener("click", () => {
    paginaAtual++;
    filtrarLembretes();
});


// ========================================
// UTILITÁRIOS
// ========================================

function formatarData(data) {
    if (!data) {
        return "-";
    }

    const parsed = new Date(data);
    if (Number.isNaN(parsed.getTime())) {
        return "-";
    }

    return parsed.toLocaleString("pt-BR");
}

function escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

function mostrarToast(mensagem, tipo = "info") {
    const toast = document.getElementById("toast");

    toast.textContent = mensagem;
    toast.className = `toast toast-${tipo}`;
    toast.classList.remove("hidden");

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.add("hidden");
    }, 3200);
}