import { describe, expect, it } from 'vitest';
import type { LeitorPacoteScrivener, ResultadoVerificacaoEscritaPacoteScrivener } from '../../src/contrarius/scrivener-package-write-verification-model';
import { verificarEscritaPacoteScrivener } from '../../src/contrarius/scrivener-package-write-verification-model';
import type { PlanoEscritaPacoteScrivener } from '../../src/contrarius/scrivener-package-write-plan-model';

function criarPlano(operacoes: Array<{ caminhoDestino: string; caminhoRelativo: string; conteudo: string }>): PlanoEscritaPacoteScrivener {
    return {
        caminhoPacote: 'pacotes/test.scrivener-package',
        operacoes: operacoes.map(op => ({
            ...op,
            tipo: 'manifest' as const,
            tamanhoCaracteres: op.conteudo.length,
        })),
        totalOperacoes: operacoes.length,
        tamanhoTotalCaracteres: operacoes.reduce((acc, op) => acc + op.conteudo.length, 0),
    };
}

function criarLeitorMemoria(arquivos: Record<string, string>): LeitorPacoteScrivener {
    const mapa = new Map(Object.entries(arquivos));
    return {
        async existeArquivoTexto(caminho) { return mapa.has(caminho); },
        async lerArquivoTexto(caminho) {
            const conteudo = mapa.get(caminho);
            if (conteudo === undefined) throw new Error(`Arquivo não encontrado: ${caminho}`);
            return conteudo;
        },
    };
}

describe('verificarEscritaPacoteScrivener', () => {
    it('plano válido com leitor em memória retorna ok', async () => {
        const plano = criarPlano([
            { caminhoDestino: 'pacotes/pkg/manifest.json', caminhoRelativo: 'manifest.json', conteudo: '{"id":"test"}' },
            { caminhoDestino: 'pacotes/pkg/README.md', caminhoRelativo: 'README.md', conteudo: '# Test' },
        ]);
        const leitor = criarLeitorMemoria({
            'pacotes/pkg/manifest.json': '{"id":"test"}',
            'pacotes/pkg/README.md': '# Test',
        });

        const resultado = await verificarEscritaPacoteScrivener(plano, leitor);

        expect(resultado.nivel).toBe('ok');
        expect(resultado.valido).toBe(true);
        expect(resultado.erros).toBe(0);
        expect(resultado.avisos).toBe(0);
        expect(resultado.arquivosVerificados).toBe(2);
        expect(resultado.arquivosAusentes).toBe(0);
        expect(resultado.arquivosDivergentes).toBe(0);
        expect(resultado.achados).toHaveLength(0);
    });

    it('arquivo ausente gera erro ARQUIVO_NAO_ENCONTRADO', async () => {
        const plano = criarPlano([
            { caminhoDestino: 'pacotes/pkg/manifest.json', caminhoRelativo: 'manifest.json', conteudo: '{}' },
        ]);
        const leitor = criarLeitorMemoria({});

        const resultado = await verificarEscritaPacoteScrivener(plano, leitor);

        expect(resultado.nivel).toBe('error');
        expect(resultado.valido).toBe(false);
        expect(resultado.erros).toBe(1);
        expect(resultado.arquivosAusentes).toBe(1);
        expect(resultado.arquivosVerificados).toBe(0);
        expect(resultado.achados[0].codigo).toBe('ARQUIVO_NAO_ENCONTRADO');
        expect(resultado.achados[0].caminhoDestino).toBe('pacotes/pkg/manifest.json');
    });

    it('conteúdo divergente gera erro CONTEUDO_DIVERGENTE', async () => {
        const plano = criarPlano([
            { caminhoDestino: 'pacotes/pkg/manifest.json', caminhoRelativo: 'manifest.json', conteudo: '{"id":"a"}' },
        ]);
        const leitor = criarLeitorMemoria({
            'pacotes/pkg/manifest.json': '{"id":"b"}',
        });

        const resultado = await verificarEscritaPacoteScrivener(plano, leitor);

        expect(resultado.nivel).toBe('error');
        expect(resultado.valido).toBe(false);
        expect(resultado.erros).toBe(1);
        expect(resultado.arquivosVerificados).toBe(1);
        expect(resultado.arquivosDivergentes).toBe(1);
        expect(resultado.arquivosAusentes).toBe(0);
        expect(resultado.achados[0].codigo).toBe('CONTEUDO_DIVERGENTE');
    });

    it('erro no exists gera LEITURA_ERRO', async () => {
        const plano = criarPlano([
            { caminhoDestino: 'pacotes/pkg/manifest.json', caminhoRelativo: 'manifest.json', conteudo: '{}' },
        ]);
        const leitor: LeitorPacoteScrivener = {
            async existeArquivoTexto() { throw new Error('Falha de I/O simulada'); },
            async lerArquivoTexto() { return '{}'; },
        };

        const resultado = await verificarEscritaPacoteScrivener(plano, leitor);

        expect(resultado.nivel).toBe('error');
        expect(resultado.valido).toBe(false);
        expect(resultado.erros).toBe(1);
        expect(resultado.achados[0].codigo).toBe('LEITURA_ERRO');
        expect(resultado.achados[0].mensagem).toContain('Falha de I/O simulada');
    });

    it('erro no read gera LEITURA_ERRO', async () => {
        const plano = criarPlano([
            { caminhoDestino: 'pacotes/pkg/manifest.json', caminhoRelativo: 'manifest.json', conteudo: '{}' },
        ]);
        const leitor: LeitorPacoteScrivener = {
            async existeArquivoTexto() { return true; },
            async lerArquivoTexto() { throw new Error('Erro de leitura simulado'); },
        };

        const resultado = await verificarEscritaPacoteScrivener(plano, leitor);

        expect(resultado.nivel).toBe('error');
        expect(resultado.valido).toBe(false);
        expect(resultado.erros).toBe(1);
        expect(resultado.arquivosVerificados).toBe(0);
        expect(resultado.achados[0].codigo).toBe('LEITURA_ERRO');
        expect(resultado.achados[0].mensagem).toContain('Erro de leitura simulado');
    });

    it('plano sem operações gera warning PLANO_SEM_OPERACOES', async () => {
        const plano: PlanoEscritaPacoteScrivener = {
            caminhoPacote: 'pacotes/pkg',
            operacoes: [],
            totalOperacoes: 0,
            tamanhoTotalCaracteres: 0,
        };
        const leitor = criarLeitorMemoria({});

        const resultado = await verificarEscritaPacoteScrivener(plano, leitor);

        expect(resultado.nivel).toBe('warning');
        expect(resultado.valido).toBe(false);
        expect(resultado.erros).toBe(0);
        expect(resultado.avisos).toBe(1);
        expect(resultado.totalOperacoes).toBe(0);
        expect(resultado.achados[0].codigo).toBe('PLANO_SEM_OPERACOES');
    });

    it('contadores são coerentes em plano misto', async () => {
        const plano = criarPlano([
            { caminhoDestino: 'pkg/a.json', caminhoRelativo: 'a.json', conteudo: 'ok' },
            { caminhoDestino: 'pkg/b.json', caminhoRelativo: 'b.json', conteudo: 'esperado' },
            { caminhoDestino: 'pkg/c.json', caminhoRelativo: 'c.json', conteudo: 'x' },
        ]);
        const leitor = criarLeitorMemoria({
            'pkg/a.json': 'ok',
            'pkg/b.json': 'diferente',
        });

        const resultado = await verificarEscritaPacoteScrivener(plano, leitor);

        expect(resultado.totalOperacoes).toBe(3);
        expect(resultado.arquivosVerificados).toBe(2);
        expect(resultado.arquivosAusentes).toBe(1);
        expect(resultado.arquivosDivergentes).toBe(1);
        expect(resultado.erros).toBe(2);
        expect(resultado.nivel).toBe('error');
    });

    it('não depende de fs/path/obsidian', async () => {
        const plano = criarPlano([
            { caminhoDestino: 'x/y.txt', caminhoRelativo: 'y.txt', conteudo: 'conteudo' },
        ]);
        const leitor = criarLeitorMemoria({ 'x/y.txt': 'conteudo' });

        const resultado: ResultadoVerificacaoEscritaPacoteScrivener = await verificarEscritaPacoteScrivener(plano, leitor);

        expect(resultado.nivel).toBe('ok');
    });
});
