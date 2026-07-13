import { describe, expect, it } from 'vitest';
import { criarArquivosEstruturadosScrivener } from '../../src/contrarius/scrivener-structured-export-model';
import { criarPayloadScrivener } from '../../src/contrarius/scrivener-package-payload-model';
import type { ManifestoScrivener } from '../../src/contrarius/scrivener-package-manifest';
import { criarReadmePacoteScrivener } from '../../src/contrarius/scrivener-package-readme-model';
import { criarPlanoPacoteScrivener } from '../../src/contrarius/scrivener-package-plan-model';

function criarManifestoBase(): ManifestoScrivener {
    return {
        id: 'exportacao-livro-1',
        criadoEm: '2000-01-01T00:00:00.000Z',
        tipo: 'exportacao',
        origemVault: 'Contrarius Enantios',
        caminhoPacote: 'contrarius-scrivener-packages/exportacao-livro-1.scrivener-package',
        livro: 'Livro 1',
        observacoes: 'Preview operacional',
        avisos: [],
        erros: [],
    };
}

describe('criarArquivosEstruturadosScrivener', () => {
    it('payload vazio cria scrivener/index.md, timeline/eventos.md e timeline/cronologia.md', () => {
        const payload = criarPayloadScrivener({ manifestoId: 'id-1', itens: [] });
        const arquivos = criarArquivosEstruturadosScrivener(payload);
        const caminhos = arquivos.map(a => a.caminhoRelativo);

        expect(caminhos).toContain('scrivener/index.md');
        expect(caminhos).toContain('scrivener/timeline/eventos.md');
        expect(caminhos).toContain('scrivener/timeline/cronologia.md');
        expect(caminhos.filter(c => c.startsWith('scrivener/dossier/'))).toHaveLength(0);
    });

    it('index.md contem titulo Contrarius Scrivener Workspace', () => {
        const payload = criarPayloadScrivener({ manifestoId: 'id-1', itens: [] });
        const arquivos = criarArquivosEstruturadosScrivener(payload);
        const index = arquivos.find(a => a.caminhoRelativo === 'scrivener/index.md');

        expect(index?.conteudo).toContain('# Contrarius Scrivener Workspace');
    });

    it('index.md tem link para ../scrivener-import.md', () => {
        const payload = criarPayloadScrivener({ manifestoId: 'id-1', itens: [] });
        const arquivos = criarArquivosEstruturadosScrivener(payload);
        const index = arquivos.find(a => a.caminhoRelativo === 'scrivener/index.md');

        expect(index?.conteudo).toContain('../scrivener-import.md');
    });

    it('index.md tem links para timeline/eventos.md e timeline/cronologia.md', () => {
        const payload = criarPayloadScrivener({ manifestoId: 'id-1', itens: [] });
        const arquivos = criarArquivosEstruturadosScrivener(payload);
        const index = arquivos.find(a => a.caminhoRelativo === 'scrivener/index.md');

        expect(index?.conteudo).toContain('timeline/eventos.md');
        expect(index?.conteudo).toContain('timeline/cronologia.md');
    });

    it('index.md tem resumo do payload com total de itens', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            geradoEm: '2000-01-01T00:00:00.000Z',
            itens: [{ id: 'c1', tipo: 'consciencia', titulo: 'Rogier' }],
        });
        const arquivos = criarArquivosEstruturadosScrivener(payload);
        const index = arquivos.find(a => a.caminhoRelativo === 'scrivener/index.md');

        expect(index?.conteudo).toContain('**Total de itens:** 1');
        expect(index?.conteudo).toContain('2000-01-01T00:00:00.000Z');
    });

    it('timeline/eventos.md tem aviso de vazio quando nao ha eventos', () => {
        const payload = criarPayloadScrivener({ manifestoId: 'id-1', itens: [] });
        const arquivos = criarArquivosEstruturadosScrivener(payload);
        const eventos = arquivos.find(a => a.caminhoRelativo === 'scrivener/timeline/eventos.md');

        expect(eventos?.conteudo).toContain('# Timeline — Eventos');
        expect(eventos?.conteudo).toContain('Nenhum evento registrado');
    });

    it('timeline/cronologia.md tem aviso de vazio quando nao ha itens cronologicos', () => {
        const payload = criarPayloadScrivener({ manifestoId: 'id-1', itens: [] });
        const arquivos = criarArquivosEstruturadosScrivener(payload);
        const cronologia = arquivos.find(a => a.caminhoRelativo === 'scrivener/timeline/cronologia.md');

        expect(cronologia?.conteudo).toContain('# Timeline — Cronologia geral');
        expect(cronologia?.conteudo).toContain('Nenhum item com dados cronológicos');
    });

    it('payload com consciencia, retrovida, evento, lugar cria dossiês correspondentes', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [
                { id: 'c1', tipo: 'consciencia', titulo: 'Rogier' },
                { id: 'r1', tipo: 'retrovida', titulo: 'Vida Anterior' },
                { id: 'e1', tipo: 'evento', titulo: 'Batalha' },
                { id: 'l1', tipo: 'lugar', titulo: 'Roma' },
            ],
        });
        const arquivos = criarArquivosEstruturadosScrivener(payload);
        const caminhos = arquivos.map(a => a.caminhoRelativo);

        expect(caminhos).toContain('scrivener/dossier/consciencias.md');
        expect(caminhos).toContain('scrivener/dossier/retrovidas.md');
        expect(caminhos).toContain('scrivener/dossier/eventos.md');
        expect(caminhos).toContain('scrivener/dossier/lugares.md');
        expect(caminhos).not.toContain('scrivener/dossier/notas.md');
    });

    it('nao cria dossie para tipo sem itens', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [{ id: 'c1', tipo: 'consciencia', titulo: 'Rogier' }],
        });
        const arquivos = criarArquivosEstruturadosScrivener(payload);
        const caminhos = arquivos.map(a => a.caminhoRelativo);

        expect(caminhos).toContain('scrivener/dossier/consciencias.md');
        expect(caminhos).not.toContain('scrivener/dossier/eventos.md');
        expect(caminhos).not.toContain('scrivener/dossier/lugares.md');
        expect(caminhos).not.toContain('scrivener/dossier/notas.md');
    });

    it('dossie tem titulo com tipo plural e total de itens', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [
                { id: 'c1', tipo: 'consciencia', titulo: 'Rogier' },
                { id: 'c2', tipo: 'consciencia', titulo: 'Hana' },
            ],
        });
        const arquivos = criarArquivosEstruturadosScrivener(payload);
        const dossie = arquivos.find(a => a.caminhoRelativo === 'scrivener/dossier/consciencias.md');

        expect(dossie?.conteudo).toContain('# Dossiê — Consciências');
        expect(dossie?.conteudo).toContain('Total: 2 itens');
    });

    it('dossie inclui todos os campos de cada item', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [{
                id: 'e1',
                tipo: 'evento',
                titulo: 'Batalha',
                caminhoFonte: 'eventos/batalha.md',
                livro: 'Livro 1',
                periodo: 'Seculo XV',
                tags: ['guerra', 'medieval'],
                metadata: { duracao: '3 dias' },
            }],
        });
        const arquivos = criarArquivosEstruturadosScrivener(payload);
        const dossie = arquivos.find(a => a.caminhoRelativo === 'scrivener/dossier/eventos.md');

        expect(dossie?.conteudo).toContain('## Batalha');
        expect(dossie?.conteudo).toContain('- ID: e1');
        expect(dossie?.conteudo).toContain('- Tipo: evento');
        expect(dossie?.conteudo).toContain('- Fonte: eventos/batalha.md');
        expect(dossie?.conteudo).toContain('- Livro: Livro 1');
        expect(dossie?.conteudo).toContain('- Período: Seculo XV');
        expect(dossie?.conteudo).toContain('- Tags: guerra, medieval');
        expect(dossie?.conteudo).toContain('"duracao": "3 dias"');
    });

    it('dossie omite campos opcionais ausentes', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [{ id: 'e1', tipo: 'evento', titulo: 'Simples' }],
        });
        const arquivos = criarArquivosEstruturadosScrivener(payload);
        const dossie = arquivos.find(a => a.caminhoRelativo === 'scrivener/dossier/eventos.md');

        expect(dossie?.conteudo).not.toContain('- Fonte:');
        expect(dossie?.conteudo).not.toContain('- Livro:');
        expect(dossie?.conteudo).not.toContain('- Período:');
        expect(dossie?.conteudo).not.toContain('- Tags:');
        expect(dossie?.conteudo).not.toContain('```json');
    });

    it('eventos sao ordenados na timeline por ordemCronologica', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [
                { id: 'e3', tipo: 'evento', titulo: 'Terceiro', ordemCronologica: 3 },
                { id: 'e1', tipo: 'evento', titulo: 'Primeiro', ordemCronologica: 1 },
                { id: 'e2', tipo: 'evento', titulo: 'Segundo', ordemCronologica: 2 },
            ],
        });
        const arquivos = criarArquivosEstruturadosScrivener(payload);
        const timeline = arquivos.find(a => a.caminhoRelativo === 'scrivener/timeline/eventos.md')!;

        const posP = timeline.conteudo.indexOf('## Primeiro');
        const posS = timeline.conteudo.indexOf('## Segundo');
        const posT = timeline.conteudo.indexOf('## Terceiro');

        expect(posP).toBeLessThan(posS);
        expect(posS).toBeLessThan(posT);
    });

    it('eventos ordenados por titulo como desempate quando sem ordemCronologica', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [
                { id: 'z', tipo: 'evento', titulo: 'Zeta' },
                { id: 'a', tipo: 'evento', titulo: 'Alpha' },
            ],
        });
        const arquivos = criarArquivosEstruturadosScrivener(payload);
        const timeline = arquivos.find(a => a.caminhoRelativo === 'scrivener/timeline/eventos.md')!;

        const posAlpha = timeline.conteudo.indexOf('## Alpha');
        const posZeta = timeline.conteudo.indexOf('## Zeta');

        expect(posAlpha).toBeLessThan(posZeta);
    });

    it('timeline/eventos.md tem campos ID, Fonte, Livro, Periodo', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [{
                id: 'e1',
                tipo: 'evento',
                titulo: 'Batalha',
                caminhoFonte: 'eventos/batalha.md',
                livro: 'Livro 1',
                periodo: 'Seculo XV',
            }],
        });
        const arquivos = criarArquivosEstruturadosScrivener(payload);
        const timeline = arquivos.find(a => a.caminhoRelativo === 'scrivener/timeline/eventos.md')!;

        expect(timeline.conteudo).toContain('- ID: e1');
        expect(timeline.conteudo).toContain('- Fonte: eventos/batalha.md');
        expect(timeline.conteudo).toContain('- Livro: Livro 1');
        expect(timeline.conteudo).toContain('- Período: Seculo XV');
    });

    it('cronologia inclui itens com ordemCronologica e exclui sem campo cronologico', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [
                { id: 'c1', tipo: 'consciencia', titulo: 'Rogier', ordemCronologica: 1 },
                { id: 'e1', tipo: 'evento', titulo: 'Batalha' },
            ],
        });
        const arquivos = criarArquivosEstruturadosScrivener(payload);
        const cronologia = arquivos.find(a => a.caminhoRelativo === 'scrivener/timeline/cronologia.md')!;

        expect(cronologia.conteudo).toContain('## Rogier');
        expect(cronologia.conteudo).not.toContain('## Batalha');
    });

    it('cronologia inclui itens com campo data em metadata', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [
                { id: 'c1', tipo: 'consciencia', titulo: 'Rogier', metadata: { data: '1450-01-01' } },
                { id: 'n1', tipo: 'nota', titulo: 'Sem data' },
            ],
        });
        const arquivos = criarArquivosEstruturadosScrivener(payload);
        const cronologia = arquivos.find(a => a.caminhoRelativo === 'scrivener/timeline/cronologia.md')!;

        expect(cronologia.conteudo).toContain('## Rogier');
        expect(cronologia.conteudo).not.toContain('## Sem data');
    });

    it('cronologia inclui itens com data_inicio, data_fim, nascimento ou morte em metadata', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [
                { id: 'a', tipo: 'lugar', titulo: 'Roma', metadata: { data_inicio: '100' } },
                { id: 'b', tipo: 'consciencia', titulo: 'Rogier', metadata: { nascimento: '1420' } },
                { id: 'c', tipo: 'consciencia', titulo: 'Hana', metadata: { morte: '1490' } },
                { id: 'd', tipo: 'evento', titulo: 'Fim', metadata: { data_fim: '1500' } },
                { id: 'n', tipo: 'nota', titulo: 'Sem campo' },
            ],
        });
        const arquivos = criarArquivosEstruturadosScrivener(payload);
        const cronologia = arquivos.find(a => a.caminhoRelativo === 'scrivener/timeline/cronologia.md')!;

        expect(cronologia.conteudo).toContain('## Roma');
        expect(cronologia.conteudo).toContain('## Rogier');
        expect(cronologia.conteudo).toContain('## Hana');
        expect(cronologia.conteudo).toContain('## Fim');
        expect(cronologia.conteudo).not.toContain('## Sem campo');
    });

    it('cronologia ordena por ordemCronologica e desempata por tipo titulo id', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [
                { id: 'e1', tipo: 'evento', titulo: 'Evento Tardio', ordemCronologica: 2 },
                { id: 'c1', tipo: 'consciencia', titulo: 'Rogier', ordemCronologica: 1 },
                { id: 'l1', tipo: 'lugar', titulo: 'Roma', ordemCronologica: 1 },
            ],
        });
        const arquivos = criarArquivosEstruturadosScrivener(payload);
        const cronologia = arquivos.find(a => a.caminhoRelativo === 'scrivener/timeline/cronologia.md')!;

        const posRogier = cronologia.conteudo.indexOf('## Rogier');
        const posRoma = cronologia.conteudo.indexOf('## Roma');
        const posEvento = cronologia.conteudo.indexOf('## Evento Tardio');

        expect(posRogier).toBeLessThan(posRoma);
        expect(posRoma).toBeLessThan(posEvento);
    });

    it('index.md lista dossiês existentes com links', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [
                { id: 'c1', tipo: 'consciencia', titulo: 'Rogier' },
                { id: 'l1', tipo: 'lugar', titulo: 'Roma' },
            ],
        });
        const arquivos = criarArquivosEstruturadosScrivener(payload);
        const index = arquivos.find(a => a.caminhoRelativo === 'scrivener/index.md')!;

        expect(index.conteudo).toContain('[Consciências](dossier/consciencias.md)');
        expect(index.conteudo).toContain('[Lugares](dossier/lugares.md)');
        expect(index.conteudo).not.toContain('dossier/eventos.md');
    });

    it('tamanhoCaracteres e igual ao comprimento do conteudo de cada arquivo', () => {
        const payload = criarPayloadScrivener({
            manifestoId: 'id-1',
            itens: [
                { id: 'e1', tipo: 'evento', titulo: 'Batalha', ordemCronologica: 1 },
                { id: 'c1', tipo: 'consciencia', titulo: 'Rogier' },
            ],
        });
        const arquivos = criarArquivosEstruturadosScrivener(payload);

        for (const arquivo of arquivos) {
            expect(arquivo.tamanhoCaracteres).toBe(arquivo.conteudo.length);
        }
    });

    it('nao depende de fs, path ou obsidian', () => {
        const payload = criarPayloadScrivener({ manifestoId: 'id-1', itens: [] });
        expect(() => criarArquivosEstruturadosScrivener(payload)).not.toThrow();
    });

    it('plano inclui arquivos estruturados e totalArquivos e consistente com o array', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            geradoEm: manifesto.criadoEm,
            itens: [
                { id: 'c1', tipo: 'consciencia', titulo: 'Rogier' },
                { id: 'e1', tipo: 'evento', titulo: 'Batalha' },
            ],
        });
        const plano = criarPlanoPacoteScrivener(manifesto, { payload });
        const caminhos = plano.arquivos.map(a => a.caminhoRelativo);

        expect(caminhos).toContain('scrivener/index.md');
        expect(caminhos).toContain('scrivener/dossier/consciencias.md');
        expect(caminhos).toContain('scrivener/dossier/eventos.md');
        expect(caminhos).toContain('scrivener/timeline/eventos.md');
        expect(caminhos).toContain('scrivener/timeline/cronologia.md');
        expect(plano.arquivos.some(a => a.tipo === 'scrivener-structured')).toBe(true);
        expect(plano.totalArquivos).toBe(plano.arquivos.length);
    });

    it('plano vazio inclui arquivos estruturados basicos sem dossiês', () => {
        const manifesto = criarManifestoBase();
        const plano = criarPlanoPacoteScrivener(manifesto);
        const caminhos = plano.arquivos.map(a => a.caminhoRelativo);

        expect(caminhos).toContain('scrivener/index.md');
        expect(caminhos).toContain('scrivener/timeline/eventos.md');
        expect(caminhos).toContain('scrivener/timeline/cronologia.md');
        expect(caminhos.filter(c => c.startsWith('scrivener/dossier/'))).toHaveLength(0);
        expect(plano.totalArquivos).toBe(plano.arquivos.length);
    });

    it('README contem link para scrivener/index.md', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({ manifestoId: manifesto.id, itens: [] });
        const readme = criarReadmePacoteScrivener(manifesto, payload);

        expect(readme.conteudo).toContain('[Scrivener workspace](scrivener/index.md)');
    });
});
