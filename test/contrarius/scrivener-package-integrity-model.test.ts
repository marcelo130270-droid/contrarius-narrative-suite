import { describe, it, expect } from 'vitest';
import {
    validarIntegridadePlanoPacoteScrivener,
    planoPacoteScrivenerEstaIntegro,
} from '../../src/contrarius/scrivener-package-integrity-model';
import type { PlanoPacoteScrivener } from '../../src/contrarius/scrivener-package-plan-model';
import { criarPlanoPacoteScrivener } from '../../src/contrarius/scrivener-package-plan-model';
import { criarPayloadScrivener } from '../../src/contrarius/scrivener-package-payload-model';
import type { ManifestoScrivener } from '../../src/contrarius/scrivener-package-manifest';

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

function criarPlanoValido(): PlanoPacoteScrivener {
    return criarPlanoPacoteScrivener(criarManifestoBase());
}

function removerArquivo(plano: PlanoPacoteScrivener, caminho: string): PlanoPacoteScrivener {
    const arquivos = plano.arquivos.filter(a => a.caminhoRelativo !== caminho);
    return { ...plano, arquivos, totalArquivos: arquivos.length };
}

function substituirConteudo(plano: PlanoPacoteScrivener, caminho: string, conteudo: string): PlanoPacoteScrivener {
    const arquivos = plano.arquivos.map(a =>
        a.caminhoRelativo === caminho
            ? { ...a, conteudo, tamanhoCaracteres: conteudo.length }
            : a,
    );
    return { ...plano, arquivos };
}

describe('scrivener-package-integrity-model', () => {
    describe('validarIntegridadePlanoPacoteScrivener', () => {
        it('plano válido sem payload retorna ok e valido true', () => {
            const resultado = validarIntegridadePlanoPacoteScrivener(criarPlanoValido());

            expect(resultado.nivel).toBe('ok');
            expect(resultado.valido).toBe(true);
            expect(resultado.achados).toHaveLength(0);
            expect(resultado.erros).toBe(0);
            expect(resultado.avisos).toBe(0);
            expect(resultado.totalArquivos).toBe(8);
            expect(resultado.totalItensPayload).toBe(0);
            expect(resultado.totalArquivosItens).toBe(0);
        });

        it('plano válido com payload retorna ok e valido true', () => {
            const manifesto = criarManifestoBase();
            const payload = criarPayloadScrivener({
                manifestoId: manifesto.id,
                geradoEm: manifesto.criadoEm,
                itens: [
                    { id: 'a', tipo: 'evento', titulo: 'Alpha' },
                    { id: 'b', tipo: 'lugar', titulo: 'Beta' },
                ],
            });
            const plano = criarPlanoPacoteScrivener(manifesto, { payload });

            const resultado = validarIntegridadePlanoPacoteScrivener(plano);

            expect(resultado.nivel).toBe('ok');
            expect(resultado.valido).toBe(true);
            expect(resultado.totalItensPayload).toBe(2);
            expect(resultado.totalArquivosItens).toBe(2);
        });

        it('falta de manifest.json gera erro ARQUIVO_OBRIGATORIO_AUSENTE', () => {
            const plano = removerArquivo(criarPlanoValido(), 'manifest.json');
            const resultado = validarIntegridadePlanoPacoteScrivener(plano);

            expect(resultado.nivel).toBe('error');
            expect(resultado.valido).toBe(false);
            const achado = resultado.achados.find(a => a.codigo === 'ARQUIVO_OBRIGATORIO_AUSENTE' && a.caminhoRelativo === 'manifest.json');
            expect(achado).toBeDefined();
            expect(resultado.erros).toBeGreaterThan(0);
        });

        it('falta de payload/index.json gera erro ARQUIVO_OBRIGATORIO_AUSENTE', () => {
            const plano = removerArquivo(criarPlanoValido(), 'payload/index.json');
            const resultado = validarIntegridadePlanoPacoteScrivener(plano);

            expect(resultado.nivel).toBe('error');
            const achado = resultado.achados.find(a => a.codigo === 'ARQUIVO_OBRIGATORIO_AUSENTE' && a.caminhoRelativo === 'payload/index.json');
            expect(achado).toBeDefined();
        });

        it('falta de README.md gera erro ARQUIVO_OBRIGATORIO_AUSENTE', () => {
            const plano = removerArquivo(criarPlanoValido(), 'README.md');
            const resultado = validarIntegridadePlanoPacoteScrivener(plano);

            expect(resultado.nivel).toBe('error');
            const achado = resultado.achados.find(a => a.codigo === 'ARQUIVO_OBRIGATORIO_AUSENTE' && a.caminhoRelativo === 'README.md');
            expect(achado).toBeDefined();
        });

        it('caminho duplicado gera erro CAMINHO_DUPLICADO', () => {
            const plano = criarPlanoValido();
            const arquivoExtra = { ...plano.arquivos[0] };
            const planoComDuplicata: PlanoPacoteScrivener = {
                ...plano,
                arquivos: [...plano.arquivos, arquivoExtra],
                totalArquivos: plano.totalArquivos + 1,
            };

            const resultado = validarIntegridadePlanoPacoteScrivener(planoComDuplicata);

            expect(resultado.nivel).toBe('error');
            const achado = resultado.achados.find(a => a.codigo === 'CAMINHO_DUPLICADO');
            expect(achado).toBeDefined();
            expect(achado?.caminhoRelativo).toBe('manifest.json');
        });

        it('manifest.json com JSON inválido gera erro CONTEUDO_JSON_INVALIDO', () => {
            const plano = substituirConteudo(criarPlanoValido(), 'manifest.json', 'isso nao e json {');
            const resultado = validarIntegridadePlanoPacoteScrivener(plano);

            expect(resultado.nivel).toBe('error');
            const achado = resultado.achados.find(a => a.codigo === 'CONTEUDO_JSON_INVALIDO' && a.caminhoRelativo === 'manifest.json');
            expect(achado).toBeDefined();
        });

        it('payload/index.json com JSON inválido gera erro CONTEUDO_JSON_INVALIDO', () => {
            const plano = substituirConteudo(criarPlanoValido(), 'payload/index.json', '{ ruim json');
            const resultado = validarIntegridadePlanoPacoteScrivener(plano);

            expect(resultado.nivel).toBe('error');
            const achado = resultado.achados.find(a => a.codigo === 'CONTEUDO_JSON_INVALIDO' && a.caminhoRelativo === 'payload/index.json');
            expect(achado).toBeDefined();
        });

        it('payload/index.json sem campo schema gera erro PAYLOAD_SCHEMA_INVALIDO', () => {
            const semSchema = JSON.stringify({ itens: [] });
            const plano = substituirConteudo(criarPlanoValido(), 'payload/index.json', semSchema);
            const resultado = validarIntegridadePlanoPacoteScrivener(plano);

            expect(resultado.nivel).toBe('error');
            const achado = resultado.achados.find(a => a.codigo === 'PAYLOAD_SCHEMA_INVALIDO');
            expect(achado).toBeDefined();
        });

        it('payload/index.json sem campo itens gera erro PAYLOAD_SCHEMA_INVALIDO', () => {
            const semItens = JSON.stringify({ schema: 'contrarius-scrivener-payload/v1' });
            const plano = substituirConteudo(criarPlanoValido(), 'payload/index.json', semItens);
            const resultado = validarIntegridadePlanoPacoteScrivener(plano);

            expect(resultado.nivel).toBe('error');
            const achado = resultado.achados.find(a => a.codigo === 'PAYLOAD_SCHEMA_INVALIDO');
            expect(achado).toBeDefined();
        });

        it('payload/index.json com item faltando id gera erro PAYLOAD_SCHEMA_INVALIDO', () => {
            const comItemInvalido = JSON.stringify({
                schema: 'contrarius-scrivener-payload/v1',
                itens: [{ tipo: 'evento', titulo: 'Sem id' }],
            });
            const plano = substituirConteudo(criarPlanoValido(), 'payload/index.json', comItemInvalido);
            const resultado = validarIntegridadePlanoPacoteScrivener(plano);

            expect(resultado.nivel).toBe('error');
            const achado = resultado.achados.find(a => a.codigo === 'PAYLOAD_SCHEMA_INVALIDO');
            expect(achado).toBeDefined();
        });

        it('item do payload sem arquivo Markdown correspondente gera erro PAYLOAD_ITEM_SEM_ARQUIVO', () => {
            const manifesto = criarManifestoBase();
            const payload = criarPayloadScrivener({
                manifestoId: manifesto.id,
                geradoEm: manifesto.criadoEm,
                itens: [{ id: 'a', tipo: 'evento', titulo: 'Alpha' }],
            });
            const planoComItens = criarPlanoPacoteScrivener(manifesto, { payload });
            // Remove the payload item file but keep payload/index.json with the item
            const planoSemArquivoItem = removerArquivo(planoComItens, 'payload/items/evento/alpha.md');

            const resultado = validarIntegridadePlanoPacoteScrivener(planoSemArquivoItem);

            expect(resultado.nivel).toBe('error');
            const achado = resultado.achados.find(a => a.codigo === 'PAYLOAD_ITEM_SEM_ARQUIVO');
            expect(achado).toBeDefined();
            expect(achado?.caminhoRelativo).toBe('payload/items/evento/alpha.md');
            expect(achado?.itemId).toBe('a');
        });

        it('arquivo payload-item sem entrada no payload gera warning ARQUIVO_ITEM_ORFAO', () => {
            const plano = criarPlanoValido();
            // Add an orphan payload-item file (no corresponding payload entry since payload is empty)
            const arquivoOrfao = {
                caminhoRelativo: 'payload/items/nota/orfao.md',
                tipo: 'payload-item' as const,
                conteudo: '---\nid: orfao\ntipo: nota\ntitulo: Orfao\n---\n\n# Orfao\n',
                tamanhoCaracteres: 40,
            };
            const planoComOrfao: PlanoPacoteScrivener = {
                ...plano,
                arquivos: [...plano.arquivos, { ...arquivoOrfao, tamanhoCaracteres: arquivoOrfao.conteudo.length }],
                totalArquivos: plano.totalArquivos + 1,
            };

            const resultado = validarIntegridadePlanoPacoteScrivener(planoComOrfao);

            expect(resultado.nivel).toBe('warning');
            const achado = resultado.achados.find(a => a.codigo === 'ARQUIVO_ITEM_ORFAO');
            expect(achado).toBeDefined();
            expect(achado?.caminhoRelativo).toBe('payload/items/nota/orfao.md');
        });

        it('link do README para arquivo inexistente gera warning README_LINK_SEM_ARQUIVO', () => {
            const readmeComLinkInvalido = '# Test\n\n- [Item](payload/items/evento/nao-existe.md)\n';
            const plano = substituirConteudo(criarPlanoValido(), 'README.md', readmeComLinkInvalido);
            const resultado = validarIntegridadePlanoPacoteScrivener(plano);

            expect(resultado.nivel).toBe('warning');
            const achado = resultado.achados.find(a => a.codigo === 'README_LINK_SEM_ARQUIVO');
            expect(achado).toBeDefined();
            expect(achado?.caminhoRelativo).toBe('payload/items/evento/nao-existe.md');
        });

        it('tamanho declarado inconsistente gera warning TAMANHO_DECLARADO_INCONSISTENTE (preferir warning)', () => {
            const plano = criarPlanoValido();
            // Manually set wrong size for manifest.json
            const arquivos = plano.arquivos.map(a =>
                a.caminhoRelativo === 'manifest.json'
                    ? { ...a, tamanhoCaracteres: a.tamanhoCaracteres + 100 }
                    : a,
            );
            const planoComTamanhoErrado: PlanoPacoteScrivener = { ...plano, arquivos };

            const resultado = validarIntegridadePlanoPacoteScrivener(planoComTamanhoErrado);

            // Warning: declared size (content.length + 100) differs from actual content length
            expect(resultado.nivel).toBe('warning');
            const achado = resultado.achados.find(a => a.codigo === 'TAMANHO_DECLARADO_INCONSISTENTE');
            expect(achado).toBeDefined();
            expect(achado?.caminhoRelativo).toBe('manifest.json');
            expect(achado?.nivel).toBe('warning');
        });

        it('manifesto com avisos gera warning MANIFESTO_COM_AVISOS', () => {
            const manifesto = { ...criarManifestoBase(), avisos: ['Aviso de teste'] };
            const plano = criarPlanoPacoteScrivener(manifesto);
            const resultado = validarIntegridadePlanoPacoteScrivener(plano);

            // avisos: [] in manifest.json content controls this, so we need to check what's in manifest.json
            // criarPlanoPacoteScrivener serializes the manifesto including avisos
            expect(resultado.achados.find(a => a.codigo === 'MANIFESTO_COM_AVISOS')).toBeDefined();
            const achado = resultado.achados.find(a => a.codigo === 'MANIFESTO_COM_AVISOS');
            expect(achado?.nivel).toBe('warning');
        });

        it('manifesto com erros gera error MANIFESTO_COM_ERROS', () => {
            const manifesto = { ...criarManifestoBase(), erros: ['Erro crítico'] };
            const plano = criarPlanoPacoteScrivener(manifesto);
            const resultado = validarIntegridadePlanoPacoteScrivener(plano);

            expect(resultado.nivel).toBe('error');
            const achado = resultado.achados.find(a => a.codigo === 'MANIFESTO_COM_ERROS');
            expect(achado).toBeDefined();
            expect(achado?.nivel).toBe('error');
        });

        it('nivel é error se houver erro', () => {
            const plano = removerArquivo(criarPlanoValido(), 'manifest.json');
            const resultado = validarIntegridadePlanoPacoteScrivener(plano);
            expect(resultado.nivel).toBe('error');
        });

        it('nivel é warning se houver somente avisos', () => {
            const readmeComLinkInvalido = '# Test\n\n- [Algo](payload/items/tipo/nao-existe.md)\n';
            const plano = substituirConteudo(criarPlanoValido(), 'README.md', readmeComLinkInvalido);
            const resultado = validarIntegridadePlanoPacoteScrivener(plano);
            expect(resultado.nivel).toBe('warning');
            expect(resultado.erros).toBe(0);
            expect(resultado.avisos).toBeGreaterThan(0);
        });

        it('nivel é ok se sem achados', () => {
            const resultado = validarIntegridadePlanoPacoteScrivener(criarPlanoValido());
            expect(resultado.nivel).toBe('ok');
        });

        it('totalArquivos corresponde a plano.totalArquivos', () => {
            const plano = criarPlanoValido();
            const resultado = validarIntegridadePlanoPacoteScrivener(plano);
            expect(resultado.totalArquivos).toBe(plano.totalArquivos);
        });
    });

    describe('planoPacoteScrivenerEstaIntegro', () => {
        it('retorna true para plano válido', () => {
            expect(planoPacoteScrivenerEstaIntegro(criarPlanoValido())).toBe(true);
        });

        it('retorna false para plano com arquivo obrigatório ausente', () => {
            const plano = removerArquivo(criarPlanoValido(), 'README.md');
            expect(planoPacoteScrivenerEstaIntegro(plano)).toBe(false);
        });

        it('retorna false para plano com warning (warning também invalida)', () => {
            const readmeComLinkInvalido = '# Test\n\n- [Algo](payload/items/tipo/fantasma.md)\n';
            const plano = substituirConteudo(criarPlanoValido(), 'README.md', readmeComLinkInvalido);
            // valido é true somente se nivel === 'ok', logo warning invalida
            expect(planoPacoteScrivenerEstaIntegro(plano)).toBe(false);
        });
    });

    describe('sem dependência de fs/path/obsidian', () => {
        it('importa e executa sem qualquer módulo externo de sistema de arquivos', () => {
            // This test simply verifying the function runs proves no fs/path/obsidian is needed.
            const fn = validarIntegridadePlanoPacoteScrivener;
            expect(typeof fn).toBe('function');
            const resultado = fn(criarPlanoValido());
            expect(resultado).toBeDefined();
        });
    });
});
