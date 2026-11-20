using Microsoft.EntityFrameworkCore;
using QuestPDF;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using umfg.programacaoiii.minimalapi._2026.Contexto;
using umfg.programacaoiii.minimalapi._2026.DTO;
using umfg.programacaoiii.minimalapi._2026.Entidades;

namespace umfg.programacaoiii.minimalapi._2026;

public class Program
{
    // Método de inicialização (startup) da aplicação .NET
    public static void Main(string[] args)
    {
        // Cria o builder responsável por configurar serviços, dependências e configurações (appsettings, env vars)
        var builder = WebApplication.CreateBuilder(args);

        // Lê a string de conexão configurada (ex.: appsettings.json / appsettings.Development.json)
        var connectionString = builder.Configuration["ConnectionString"] ?? string.Empty;

        // Registra o contexto do Entity Framework Core para acessar o banco MySQL
        builder.Services
            .AddDbContext<MySqlContexto>(options => options.UseMySQL(connectionString));
        // Exemplo alternativo comentado de string de conexão direta:
        // .AddDbContext<MySqlContexto>(options => options.UseMySQL("Server=localhost;Port=3308;Database=umfg_lembrete_develop;Uid=root;Pwd=;"));

        // Configura a política de CORS ("Frontend") para permitir que o front-end (ex.: http://127.0.0.1:5500)
        // acesse a API em outra origem/porta (http://localhost:5207) via navegador
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("Frontend", policy =>
            {
                policy
                    .AllowAnyOrigin()   // Permite qualquer origem (em produção, recomenda-se restringir com WithOrigins)
                    .AllowAnyHeader()   // Permite quaisquer cabeçalhos HTTP (ex.: Content-Type)
                    .AllowAnyMethod();  // Permite qualquer verbo HTTP (GET, POST, PUT, DELETE, etc.)
            });
        });

        // Constrói a instância da aplicação web
        var app = builder.Build();

        // [POST /lembretes] - Cadastra um novo lembrete a partir do JSON enviado no corpo da requisição
        // Retorna 201 Created com a localização (/lembretes/{id}) e o objeto criado
        app.MapPost("/lembretes", async (Lembrete lembrete, MySqlContexto contexto) =>
        {
            await contexto.Lembrete.AddAsync(lembrete);
            await contexto.SaveChangesAsync();

            return Results.Created($"/lembretes/{lembrete.Id}", lembrete);
        });

        // [GET /lembretes/{id}] - Busca um lembrete ativo específico pelo ID (Guid)
        // Retorna 400 BadRequest se o id estiver vazio, 404 NotFound se não existir/estiver inativo, ou 200 OK com o registro
        app.MapGet("/lembretes/{id}", async (string id, MySqlContexto contexto) =>
        {
            if (string.IsNullOrWhiteSpace(id))
                return Results.BadRequest("id invalido!");

            return await contexto.Lembrete.FirstOrDefaultAsync(x => x.Id == Guid.Parse(id) && x.IsAtivo)
                is Lembrete lembrete ? Results.Ok(lembrete) : Results.NotFound();
        });

        // [GET /lembretes] - Lista todos os lembretes ativos (IsAtivo == true)
        // Retorna 200 OK com a lista de registros
        app.MapGet("/lembretes", async (MySqlContexto contexto) =>
        {
            return await contexto.Lembrete.Where(x => x.IsAtivo).ToListAsync();
        });

        // [GET /lembretes/filtro] - Consulta lembretes com filtros, ordenação e paginação via query string
        // Exige NumeroPagina > 0 e TamanhoPagina > 0; retorna 200 OK com { Total, NumeroPagina, TamanhoPagina, Lembretes }
        app.MapGet("/lembretes/filtro", async ([AsParameters] LembreteQueryDTO.LembreteQueryRequestDTO dto, MySqlContexto contexto) =>
        {
            if (dto.NumeroPagina <= 0 || dto.TamanhoPagina <= 0)
                return Results.BadRequest("Página e tamanho da página são obrigatórios.");

            var (lembretes, total) = await FiltrarLembretes(dto, contexto);

            var resultado = new LembreteQueryDTO.LembreteQueryResponseDTO()
            {
                Total = total,
                NumeroPagina = dto.NumeroPagina,
                TamanhoPagina = dto.TamanhoPagina,
                Lembretes = lembretes,
            };

            return Results.Ok(resultado);
        });

        // Define a licença comunitária da biblioteca QuestPDF para geração de documentos PDF
        Settings.License = LicenseType.Community;

        // [GET /lembretes/imprimir] - Gera e retorna um PDF ("relatorio-lembretes.pdf") aplicando os mesmos filtros
        app.MapGet("/lembretes/imprimir", async ([AsParameters] LembreteQueryDTO.LembreteQueryRequestDTO dto, MySqlContexto contexto) =>
        {
            if (dto.NumeroPagina <= 0 || dto.TamanhoPagina <= 0)
                return Results.BadRequest("Página e tamanho da página são obrigatórios.");

            var (lembretes, total) = await FiltrarLembretes(dto, contexto);

            var documento = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(2, Unit.Centimetre);
                    page.PageColor(Color.FromHex("#FFFFFF"));

                    page.Header()
                        .Text("Relatório de Lembretes")
                        .SemiBold()
                        .FontSize(20)
                        .FontColor(Colors.Blue.Medium);

                    page
                        .Content()
                        .PaddingVertical(10)
                        .Column(column =>
                        {
                            column.Spacing(10);
                            column.Item().Text($"Gerado em: {DateTime.Now.ToLocalTime()}");

                            column
                                .Item()
                                .Table(tabela =>
                                {
                                    tabela.ColumnsDefinition(columns =>
                                    {
                                        columns.RelativeColumn();
                                        columns.ConstantColumn(110);
                                        columns.ConstantColumn(110);
                                        columns.ConstantColumn(80);
                                    });

                                    tabela.Header(header =>
                                    {
                                        header.Cell().Text("Descrição").SemiBold();
                                        header.Cell().Text("Cadastro").SemiBold();
                                        header.Cell().Text("Atualização").SemiBold();
                                        header.Cell().Text("Status").SemiBold();
                                    });

                                    foreach (var lembrete in lembretes)
                                    {
                                        tabela.Cell().Text(lembrete.Descricao).FontSize(10);
                                        tabela.Cell().Text(lembrete.DataCadastro.ToLocalTime()).FontSize(10);
                                        tabela.Cell().Text(lembrete.DataAtualizacao.ToLocalTime()).FontSize(10);
                                        tabela.Cell()
                                            .Text(lembrete.IsAtivo ? "Ativo" : "Inativo")
                                            .FontSize(10)
                                            .FontColor(lembrete.IsAtivo ? Colors.Green.Medium : Colors.Red.Medium);
                                    }
                                });
                        });

                    page.Footer().AlignCenter().Text(x => x.CurrentPageNumber());
                });
            });

            return Results.File(documento.GeneratePdf(), "application/pdf", "relatorio-lembretes.pdf");
        });

        // [DELETE /lembretes/{id}] - Exclusão lógica: marca IsAtivo = false e atualiza DataAtualizacao
        // Retorna 404 NotFound se não encontrar ou 204 NoContent após salvar
        app.MapDelete("/lembretes/{id}", async (string id, MySqlContexto contexto) =>
        {
            var lembrete = await contexto.Lembrete.FindAsync(Guid.Parse(id));

            // Fail first: encerra cedo caso o registro não exista
            if (lembrete is null)
                return Results.NotFound();

            lembrete.SetAtivo(false);
            lembrete.Update();

            contexto.Lembrete.Update(lembrete);
            await contexto.SaveChangesAsync();

            return Results.NoContent();
        });

        // [PUT /lembretes/{id}] - Atualiza a descrição e a data de atualização de um lembrete existente
        // Retorna 404 NotFound se não encontrar ou 200 OK com o registro atualizado
        app.MapPut("/lembretes/{id}", async (string id, LembreteDTO dto, MySqlContexto contexto) =>
        {
            var lembreteExistente = await contexto.Lembrete.FindAsync(Guid.Parse(id));

            if (lembreteExistente is null)
                return Results.NotFound();

            lembreteExistente.SetDescricao(dto.Descricao);
            lembreteExistente.Update();

            contexto.Lembrete.Update(lembreteExistente);
            await contexto.SaveChangesAsync();

            return Results.Ok(lembreteExistente);
        });

        // Redireciona requisições HTTP para HTTPS quando aplicável
        app.UseHttpsRedirection();

        // Ativa a política de CORS "Frontend" no pipeline da aplicação
        app.UseCors("Frontend");

        // Inicia o servidor web e aguarda requisições (tudo após app.Run() só roda ao encerrar a API)
        app.Run();
    }

    // Aplica filtros de descrição e datas, ordenação (Ordem/Direcao) e paginação (NumeroPagina/TamanhoPagina)
    private static async Task<(List<Lembrete>, long)> FiltrarLembretes(
        LembreteQueryDTO.LembreteQueryRequestDTO dto, MySqlContexto contexto)
    {
        // Consulta base sem rastreamento de alterações (AsNoTracking) trazendo apenas registros ativos
        var query = contexto.Lembrete
            .AsNoTracking()
            .Where(x => x.IsAtivo);

        // Filtro por descrição escapando caracteres coringa do SQL LIKE (\, %, _)
        if (!string.IsNullOrWhiteSpace(dto.Descricao))
        {
            var termo = dto.Descricao.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
            query = query.Where(x => EF.Functions.Like(x.Descricao, $"%{termo}%"));
        }

        // Filtros opcionais de intervalo de data de cadastro
        if (dto.DataCadastroInicial > DateTime.MinValue)
            query = query.Where(x => x.DataCadastro >= dto.DataCadastroInicial);

        if (dto.DataCadastroFinal < DateTime.MaxValue)
            query = query.Where(x => x.DataCadastro < dto.DataCadastroFinal.Date.AddDays(1)); // Inclui o dia final inteiro

        // Filtros opcionais de intervalo de data de atualização
        if (dto.DataAtualizacaoInicial > DateTime.MinValue)
            query = query.Where(x => x.DataAtualizacao >= dto.DataAtualizacaoInicial);

        if (dto.DataAtualizacaoFinal < DateTime.MaxValue)
            query = query.Where(x => x.DataAtualizacao < dto.DataAtualizacaoFinal.Date.AddDays(1)); // Inclui o dia final inteiro

        // Normaliza direção de ordenação; padrão é "DESC" caso venha algo diferente de ASC/DESC
        if (dto.Direcao.ToUpper() != "ASC" && dto.Direcao.ToUpper() != "DESC")
            dto.Direcao = "DESC";

        // Aplica ordenação conforme direção e campo solicitado (dto.Ordem)
        query = dto.Direcao.ToUpper() == "DESC"
            ? query.OrderByDescending(x => dto.Ordem)
            : query.OrderBy(x => dto.Ordem);

        // Calcula o deslocamento (Skip) e limita a quantidade de itens por página (Take)
        var pular = (dto.NumeroPagina - 1) * dto.TamanhoPagina;
        var lembretes = await query.Skip(pular).Take(dto.TamanhoPagina).ToListAsync();
        var total = await query.CountAsync();

        return (lembretes, total);
    }
}