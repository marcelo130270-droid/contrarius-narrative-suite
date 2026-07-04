import { describe, expect, it } from 'vitest';
import type { AlteracaoNarrativaEvento } from '../../src/contrarius/narrative-order-model';
import {
  ErroPatchFrontmatterEvento,
} from '../../src/contrarius/evento-frontmatter-patcher';
import {
  ErroSalvamentoNarrativo,
  descreverErroSalvamentoNarrativo,
  executarSalvamentoNarrativo,
  prepararSalvamentoNarrativo,
  type ArmazenamentoNotasNarrativas,
  type DescricaoErroSalvamentoNarrativo,
} from '../../src/contrarius/narrative-order-write-service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FM = (ordem: number | string, cap: string, cena: string): string =>
  `---\ntitulo: Evento\nordem_narrativa: ${ordem}\ncapitulo: ${cap}\ncena: ${cena}\n---\n# Corpo\n`;

const FM_ALIAS = (ordem: number, cap: string, cena: string): string =>
  `---\ntitulo: Evento\nordemNarrativa: ${ordem}\ncapítulo: ${cap}\ncena: ${cena}\n---\n`;

const FM_CRLF = (ordem: number, cap: string, cena: string): string =>
  `---\r\ntitulo: Evento\r\nordem_narrativa: ${ordem}\r\ncapitulo: ${cap}\r\ncena: ${cena}\r\n---\r\n`;

const FM_UNICODE = (ordem: number): string =>
  `---\ntitulo: Événement ñoño 世界\nordem_narrativa: ${ordem}\ncapitulo: \ncena: \n---\n# 日本語テスト\n`;

const SEM_FM = '# Sem frontmatter\nTexto livre.\n';

function alt(
  filePath: string,
  antesOrdem: number | null,
  depoisOrdem: number | null,
  depoisCap = '',
  depoisCena = '',
): AlteracaoNarrativaEvento {
  return {
    chave: `evento:${filePath}:id`,
    id: 'id',
    filePath,
    antes: { ordemNarrativa: antesOrdem, capitulo: '', cena: '' },
    depois: { ordemNarrativa: depoisOrdem, capitulo: depoisCap, cena: depoisCena },
  };
}

function alt3(
  filePath: string,
  antes: { ordemNarrativa: number | null; capitulo: string; cena: string },
  depois: { ordemNarrativa: number | null; capitulo: string; cena: string },
): AlteracaoNarrativaEvento {
  return { chave: `evento:${filePath}:id`, id: 'id', filePath, antes, depois };
}

// Armazenamento simples com log de operações
function criarStorage(
  inicial: Record<string, string>,
  opcoesEscrita: Record<string, 'ok' | 'fail'> = {},
): {
  storage: ArmazenamentoNotasNarrativas;
  log: string[];
  conteudos: Map<string, string>;
} {
  const conteudos = new Map(Object.entries(inicial));
  const log: string[] = [];
  const storage: ArmazenamentoNotasNarrativas = {
    async ler(filePath: string): Promise<string> {
      log.push(`ler:${filePath}`);
      const c = conteudos.get(filePath);
      if (c === undefined) throw new Error(`Arquivo não encontrado: ${filePath}`);
      return c;
    },
    async escrever(filePath: string, conteudo: string): Promise<void> {
      log.push(`escrever:${filePath}`);
      if (opcoesEscrita[filePath] === 'fail') throw new Error(`Erro de escrita: ${filePath}`);
      conteudos.set(filePath, conteudo);
    },
  };
  return { storage, log, conteudos };
}

// Armazenamento onde cada chamada de escrever tem resultado sequencial
function criarStorageSequencial(
  inicial: Record<string, string>,
  resultadosEscrita: Array<'ok' | 'fail'>,
  opcoesLeitura: Record<string, 'fail'> = {},
): {
  storage: ArmazenamentoNotasNarrativas;
  log: string[];
  conteudos: Map<string, string>;
} {
  const conteudos = new Map(Object.entries(inicial));
  const log: string[] = [];
  let idxEscrita = 0;
  const storage: ArmazenamentoNotasNarrativas = {
    async ler(filePath: string): Promise<string> {
      log.push(`ler:${filePath}`);
      if (opcoesLeitura[filePath] === 'fail') throw new Error(`Erro de leitura: ${filePath}`);
      const c = conteudos.get(filePath);
      if (c === undefined) throw new Error(`Não encontrado: ${filePath}`);
      return c;
    },
    async escrever(filePath: string, conteudo: string): Promise<void> {
      const resultado = resultadosEscrita[idxEscrita++] ?? 'ok';
      log.push(`escrever:${filePath}`);
      if (resultado === 'fail') throw new Error(`Erro sequencial em: ${filePath}`);
      conteudos.set(filePath, conteudo);
    },
  };
  return { storage, log, conteudos };
}

// ─── prepararSalvamentoNarrativo ──────────────────────────────────────────────

describe('prepararSalvamentoNarrativo', () => {
  it('nenhuma alteração — retorna array vazio sem chamar armazenamento', async () => {
    let chamadas = 0;
    const storage: ArmazenamentoNotasNarrativas = {
      async ler() { chamadas++; return ''; },
      async escrever() { chamadas++; },
    };
    const result = await prepararSalvamentoNarrativo([], storage);
    expect(result).toEqual([]);
    expect(chamadas).toBe(0);
  });

  it('uma alteração — lê e aplica patch corretamente', async () => {
    const conteudo = FM(1, 'Cap1', 'C1');
    const { storage } = criarStorage({ 'a.md': conteudo });
    const result = await prepararSalvamentoNarrativo(
      [alt('a.md', 1, 5)],
      storage,
    );
    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('a.md');
    expect(result[0].conteudoOriginal).toBe(conteudo);
    expect(result[0].conteudoNovo).toContain('ordem_narrativa: 5');
    expect(result[0].camposAlterados).toContain('ordem_narrativa');
  });

  it('não escreve nada — prepararSalvamentoNarrativo é somente leitura', async () => {
    const { storage, log } = criarStorage({ 'a.md': FM(1, 'X', 'Y') });
    await prepararSalvamentoNarrativo([alt('a.md', 1, 2)], storage);
    expect(log.some((e) => e.startsWith('escrever:'))).toBe(false);
  });

  it('repetibilidade — duas chamadas com mesmo estado retornam resultados equivalentes', async () => {
    const conteudo = FM(1, 'Cap', 'Cena');
    const { storage } = criarStorage({ 'a.md': conteudo });
    const alteracoes: readonly AlteracaoNarrativaEvento[] = [alt('a.md', 1, 99)];
    const r1 = await prepararSalvamentoNarrativo(alteracoes, storage);
    const r2 = await prepararSalvamentoNarrativo(alteracoes, storage);
    expect(r1[0].conteudoNovo).toBe(r2[0].conteudoNovo);
  });

  it('imutabilidade — o array de alterações não é modificado', async () => {
    const { storage } = criarStorage({ 'z.md': FM(1, 'X', 'Y'), 'a.md': FM(2, 'X', 'Y') });
    const alteracoes: AlteracaoNarrativaEvento[] = [alt('z.md', 1, 10), alt('a.md', 2, 20)];
    const copia = [...alteracoes];
    await prepararSalvamentoNarrativo(alteracoes, storage);
    expect(alteracoes[0].filePath).toBe(copia[0].filePath);
    expect(alteracoes[1].filePath).toBe(copia[1].filePath);
  });

  it('caminho vazio — lança etapa validacao', async () => {
    const { storage } = criarStorage({});
    await expect(prepararSalvamentoNarrativo([alt('', null, 1)], storage)).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ErroSalvamentoNarrativo &&
        e.etapa === 'validacao' &&
        e.filePath === '',
    );
  });

  it('caminho duplicado — lança etapa validacao', async () => {
    const { storage } = criarStorage({ 'a.md': FM(1, '', '') });
    await expect(
      prepararSalvamentoNarrativo([alt('a.md', 1, 2), alt('a.md', 1, 3)], storage),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ErroSalvamentoNarrativo &&
        e.etapa === 'validacao' &&
        e.filePath === 'a.md',
    );
  });

  it('falha de leitura — lança etapa leitura com causa e filePath corretos', async () => {
    const { storage } = criarStorageSequencial(
      { 'a.md': FM(1, '', '') },
      [],
      { 'b.md': 'fail' },
    );
    const alteracoes = [alt('a.md', 1, 2), alt('b.md', 1, 2)];
    let erro: ErroSalvamentoNarrativo | null = null;
    try {
      await prepararSalvamentoNarrativo(alteracoes, storage);
    } catch (e) {
      if (e instanceof ErroSalvamentoNarrativo) erro = e;
    }
    expect(erro).not.toBeNull();
    expect(erro!.etapa).toBe('leitura');
    expect(erro!.filePath).toBe('b.md');
    expect(erro!.causa).toBeInstanceOf(Error);
  });

  it('falha de patch — lança etapa preparacao sem qualquer escrita', async () => {
    const { storage, log } = criarStorage({ 'a.md': FM(1, '', ''), 'b.md': SEM_FM });
    let erro: ErroSalvamentoNarrativo | null = null;
    try {
      await prepararSalvamentoNarrativo([alt('a.md', 1, 2), alt('b.md', 1, 2)], storage);
    } catch (e) {
      if (e instanceof ErroSalvamentoNarrativo) erro = e;
    }
    expect(erro).not.toBeNull();
    expect(erro!.etapa).toBe('preparacao');
    expect(erro!.filePath).toBe('b.md');
    expect(log.some((e) => e.startsWith('escrever:'))).toBe(false);
  });
});

// ─── executarSalvamentoNarrativo ──────────────────────────────────────────────

describe('executarSalvamentoNarrativo', () => {
  it('nenhuma alteração — retorna arrays vazios sem chamar armazenamento', async () => {
    let chamadas = 0;
    const storage: ArmazenamentoNotasNarrativas = {
      async ler() { chamadas++; return ''; },
      async escrever() { chamadas++; },
    };
    const result = await executarSalvamentoNarrativo([], storage);
    expect(result.arquivosAlterados).toEqual([]);
    expect(result.arquivosSemMudanca).toEqual([]);
    expect(chamadas).toBe(0);
  });

  it('uma alteração — escreve o arquivo modificado', async () => {
    const { storage, conteudos } = criarStorage({ 'a.md': FM(1, 'Cap', 'C') });
    const result = await executarSalvamentoNarrativo([alt('a.md', 1, 5)], storage);
    expect(result.arquivosAlterados).toEqual(['a.md']);
    expect(result.arquivosSemMudanca).toEqual([]);
    expect(conteudos.get('a.md')).toContain('ordem_narrativa: 5');
  });

  it('várias alterações — escreve todos os arquivos modificados', async () => {
    const { storage, conteudos } = criarStorage({
      'a.md': FM(1, 'Cap', 'C'),
      'b.md': FM(2, 'Cap', 'C'),
      'c.md': FM(3, 'Cap', 'C'),
    });
    const result = await executarSalvamentoNarrativo(
      [alt('a.md', 1, 10), alt('b.md', 2, 20), alt('c.md', 3, 30)],
      storage,
    );
    expect(result.arquivosAlterados).toHaveLength(3);
    expect(conteudos.get('a.md')).toContain('ordem_narrativa: 10');
    expect(conteudos.get('b.md')).toContain('ordem_narrativa: 20');
    expect(conteudos.get('c.md')).toContain('ordem_narrativa: 30');
  });

  it('ordem determinística — escreve em ordem alfabética independente da entrada', async () => {
    const { storage, log } = criarStorage({
      'a.md': FM(1, 'X', 'Y'),
      'c.md': FM(3, 'X', 'Y'),
      'b.md': FM(2, 'X', 'Y'),
    });
    await executarSalvamentoNarrativo(
      [alt('c.md', 3, 30), alt('a.md', 1, 10), alt('b.md', 2, 20)],
      storage,
    );
    const escritas = log.filter((e) => e.startsWith('escrever:')).map((e) => e.slice('escrever:'.length));
    expect(escritas).toEqual(['a.md', 'b.md', 'c.md']);
  });

  it('patch sem mudança — não escreve o arquivo inalterado', async () => {
    // Todos os três campos idênticos — patcher não gera mudança, não escreve
    const conteudo = FM(5, 'Cap5', 'Cena5');
    const { storage, log } = criarStorage({ 'a.md': conteudo });
    const result = await executarSalvamentoNarrativo(
      [alt3('a.md',
        { ordemNarrativa: 5, capitulo: 'Cap5', cena: 'Cena5' },
        { ordemNarrativa: 5, capitulo: 'Cap5', cena: 'Cena5' },
      )],
      storage,
    );
    expect(result.arquivosAlterados).toEqual([]);
    expect(result.arquivosSemMudanca).toEqual(['a.md']);
    expect(log.some((e) => e.startsWith('escrever:'))).toBe(false);
  });

  it('caminho vazio — lança etapa validacao', async () => {
    const { storage } = criarStorage({});
    await expect(executarSalvamentoNarrativo([alt('', null, 1)], storage)).rejects.toSatisfy(
      (e: unknown) => e instanceof ErroSalvamentoNarrativo && e.etapa === 'validacao',
    );
  });

  it('caminho duplicado — lança etapa validacao', async () => {
    const { storage } = criarStorage({ 'a.md': FM(1, '', '') });
    await expect(
      executarSalvamentoNarrativo([alt('a.md', 1, 2), alt('a.md', 1, 3)], storage),
    ).rejects.toSatisfy(
      (e: unknown) => e instanceof ErroSalvamentoNarrativo && e.etapa === 'validacao',
    );
  });

  it('falha de leitura — lança etapa leitura e não escreve nada', async () => {
    const { storage, log } = criarStorageSequencial(
      { 'a.md': FM(1, '', '') },
      [],
      { 'b.md': 'fail' },
    );
    let etapa: string | null = null;
    try {
      await executarSalvamentoNarrativo([alt('a.md', 1, 2), alt('b.md', 1, 2)], storage);
    } catch (e) {
      if (e instanceof ErroSalvamentoNarrativo) etapa = e.etapa;
    }
    expect(etapa).toBe('leitura');
    expect(log.some((e) => e.startsWith('escrever:'))).toBe(false);
  });

  it('falha de patch — lança etapa preparacao e não escreve nada', async () => {
    const { storage, log } = criarStorage({ 'a.md': FM(1, '', ''), 'b.md': SEM_FM });
    let etapa: string | null = null;
    try {
      await executarSalvamentoNarrativo([alt('a.md', 1, 2), alt('b.md', 1, 2)], storage);
    } catch (e) {
      if (e instanceof ErroSalvamentoNarrativo) etapa = e.etapa;
    }
    expect(etapa).toBe('preparacao');
    expect(log.some((e) => e.startsWith('escrever:'))).toBe(false);
  });

  it('falha na primeira escrita — etapa escrita, sem reversão necessária', async () => {
    const { storage } = criarStorage(
      { 'a.md': FM(1, '', '') },
      { 'a.md': 'fail' },
    );
    let erro: ErroSalvamentoNarrativo | null = null;
    try {
      await executarSalvamentoNarrativo([alt('a.md', 1, 2)], storage);
    } catch (e) {
      if (e instanceof ErroSalvamentoNarrativo) erro = e;
    }
    expect(erro).not.toBeNull();
    expect(erro!.etapa).toBe('escrita');
    expect(erro!.filePath).toBe('a.md');
    expect(erro!.causa).toBeInstanceOf(Error);
  });

  it('falha após escrita — reverte e lança etapa escrita', async () => {
    // a=OK, b=OK, c=FAIL → reverte b, reverte a
    const { storage, log, conteudos } = criarStorageSequencial(
      {
        'a.md': FM(1, '', ''),
        'b.md': FM(2, '', ''),
        'c.md': FM(3, '', ''),
      },
      ['ok', 'ok', 'fail', 'ok', 'ok'], // escrever a, b, c(fail), reverter b, reverter a
    );
    const originalA = conteudos.get('a.md')!;
    const originalB = conteudos.get('b.md')!;

    let erro: ErroSalvamentoNarrativo | null = null;
    try {
      await executarSalvamentoNarrativo(
        [alt('a.md', 1, 10), alt('b.md', 2, 20), alt('c.md', 3, 30)],
        storage,
      );
    } catch (e) {
      if (e instanceof ErroSalvamentoNarrativo) erro = e;
    }

    expect(erro).not.toBeNull();
    expect(erro!.etapa).toBe('escrita');
    expect(erro!.filePath).toBe('c.md');

    // Restauração exata do conteúdo original
    expect(conteudos.get('a.md')).toBe(originalA);
    expect(conteudos.get('b.md')).toBe(originalB);
  });

  it('reversão inversa — reverte em ordem inversa à da escrita', async () => {
    const { storage, log } = criarStorageSequencial(
      {
        'a.md': FM(1, '', ''),
        'b.md': FM(2, '', ''),
        'c.md': FM(3, '', ''),
      },
      ['ok', 'ok', 'fail', 'ok', 'ok'],
    );
    try {
      await executarSalvamentoNarrativo(
        [alt('a.md', 1, 10), alt('b.md', 2, 20), alt('c.md', 3, 30)],
        storage,
      );
    } catch {
      // esperado
    }
    const escritas = log.filter((e) => e.startsWith('escrever:')).map((e) => e.slice('escrever:'.length));
    // Ordem: a(escrita), b(escrita), c(falha), b(reversão), a(reversão)
    expect(escritas).toEqual(['a.md', 'b.md', 'c.md', 'b.md', 'a.md']);
  });

  it('restauração exata — conteúdo revertido é idêntico ao original', async () => {
    const originalA = FM(1, 'CapA', 'CenaA');
    const originalB = FM(2, 'CapB', 'CenaB');
    const { storage, conteudos } = criarStorageSequencial(
      { 'a.md': originalA, 'b.md': originalB, 'c.md': FM(3, '', '') },
      ['ok', 'ok', 'fail', 'ok', 'ok'],
    );
    try {
      await executarSalvamentoNarrativo(
        [alt('a.md', 1, 10), alt('b.md', 2, 20), alt('c.md', 3, 30)],
        storage,
      );
    } catch {
      // esperado
    }
    expect(conteudos.get('a.md')).toBe(originalA);
    expect(conteudos.get('b.md')).toBe(originalB);
  });

  it('falha de reversão — lança etapa reversao com filePath e causa corretos', async () => {
    // a=OK, b=OK, c=FAIL(escrita), b=FAIL(reversão)
    const { storage } = criarStorageSequencial(
      {
        'a.md': FM(1, '', ''),
        'b.md': FM(2, '', ''),
        'c.md': FM(3, '', ''),
      },
      ['ok', 'ok', 'fail', 'fail'], // a, b, c(escrita falha), b(reversão falha)
    );
    let erro: ErroSalvamentoNarrativo | null = null;
    try {
      await executarSalvamentoNarrativo(
        [alt('a.md', 1, 10), alt('b.md', 2, 20), alt('c.md', 3, 30)],
        storage,
      );
    } catch (e) {
      if (e instanceof ErroSalvamentoNarrativo) erro = e;
    }
    expect(erro).not.toBeNull();
    expect(erro!.etapa).toBe('reversao');
    expect(erro!.filePath).toBe('b.md');
    expect(erro!.causa).toBeInstanceOf(Error);
  });

  it('etapa, caminho e causa corretos no ErroSalvamentoNarrativo', async () => {
    const causaOriginal = new Error('causa original');
    const storage: ArmazenamentoNotasNarrativas = {
      async ler() { throw causaOriginal; },
      async escrever() { /* não deve ser chamado */ },
    };
    let erro: ErroSalvamentoNarrativo | null = null;
    try {
      await executarSalvamentoNarrativo([alt('x.md', 1, 2)], storage);
    } catch (e) {
      if (e instanceof ErroSalvamentoNarrativo) erro = e;
    }
    expect(erro).not.toBeNull();
    expect(erro!.etapa).toBe('leitura');
    expect(erro!.filePath).toBe('x.md');
    expect(erro!.causa).toBe(causaOriginal);
    expect(erro!.name).toBe('ErroSalvamentoNarrativo');
    expect(erro!.message).toContain('x.md');
  });

  it('imutabilidade — o array de alterações não é modificado', async () => {
    const { storage } = criarStorage({ 'z.md': FM(5, '', ''), 'a.md': FM(1, '', '') });
    const alteracoes: AlteracaoNarrativaEvento[] = [alt('z.md', 5, 50), alt('a.md', 1, 10)];
    const ordemOriginal = alteracoes.map((a) => a.filePath);
    await executarSalvamentoNarrativo(alteracoes, storage);
    expect(alteracoes.map((a) => a.filePath)).toEqual(ordemOriginal);
  });

  it('LF — preserva quebra de linha LF', async () => {
    const { storage, conteudos } = criarStorage({ 'a.md': FM(1, '', '') });
    await executarSalvamentoNarrativo([alt('a.md', 1, 99)], storage);
    expect(conteudos.get('a.md')).not.toContain('\r');
  });

  it('CRLF — preserva quebra de linha CRLF', async () => {
    const { storage, conteudos } = criarStorage({ 'a.md': FM_CRLF(1, '', '') });
    await executarSalvamentoNarrativo([alt('a.md', 1, 99)], storage);
    const novo = conteudos.get('a.md')!;
    const crlfs = (novo.match(/\r\n/g) ?? []).length;
    const lfs = (novo.match(/\n/g) ?? []).length;
    expect(crlfs).toBe(lfs);
  });

  it('Unicode — processa arquivo com conteúdo Unicode corretamente', async () => {
    const { storage, conteudos } = criarStorage({ 'a.md': FM_UNICODE(1) });
    await executarSalvamentoNarrativo([alt('a.md', 1, 7)], storage);
    expect(conteudos.get('a.md')).toContain('ordem_narrativa: 7');
    expect(conteudos.get('a.md')).toContain('日本語テスト');
  });

  it('aliases — reconhece ordemNarrativa e capítulo como aliases', async () => {
    const { storage, conteudos } = criarStorage({ 'a.md': FM_ALIAS(1, 'Cap', 'C') });
    await executarSalvamentoNarrativo(
      [alt3('a.md', { ordemNarrativa: 1, capitulo: 'Cap', cena: 'C' }, { ordemNarrativa: 9, capitulo: 'Novo', cena: 'C' })],
      storage,
    );
    const novo = conteudos.get('a.md')!;
    expect(novo).toContain('ordemNarrativa: 9');
    expect(novo).toContain('capítulo: Novo');
  });

  it('três campos juntos — altera ordem, capítulo e cena simultaneamente', async () => {
    const { storage, conteudos } = criarStorage({ 'a.md': FM(1, 'Cap1', 'Cena1') });
    await executarSalvamentoNarrativo(
      [alt3('a.md', { ordemNarrativa: 1, capitulo: 'Cap1', cena: 'Cena1' }, { ordemNarrativa: 99, capitulo: 'CapFim', cena: 'CenaFim' })],
      storage,
    );
    const novo = conteudos.get('a.md')!;
    expect(novo).toContain('ordem_narrativa: 99');
    expect(novo).toContain('capitulo: CapFim');
    expect(novo).toContain('cena: CenaFim');
  });

  it('null — aceita ordemNarrativa null e escreve campo vazio', async () => {
    const { storage, conteudos } = criarStorage({ 'a.md': FM(5, '', '') });
    await executarSalvamentoNarrativo(
      [alt3('a.md', { ordemNarrativa: 5, capitulo: '', cena: '' }, { ordemNarrativa: null, capitulo: '', cena: '' })],
      storage,
    );
    const novo = conteudos.get('a.md')!;
    expect(novo).toMatch(/ordem_narrativa:\s*\n/);
  });

  it('zero — aceita ordemNarrativa zero', async () => {
    const { storage, conteudos } = criarStorage({ 'a.md': FM(1, '', '') });
    await executarSalvamentoNarrativo([alt('a.md', 1, 0)], storage);
    expect(conteudos.get('a.md')).toContain('ordem_narrativa: 0');
  });

  it('negativo — aceita ordemNarrativa negativa', async () => {
    const { storage, conteudos } = criarStorage({ 'a.md': FM(1, '', '') });
    await executarSalvamentoNarrativo([alt('a.md', 1, -5)], storage);
    expect(conteudos.get('a.md')).toContain('ordem_narrativa: -5');
  });

  it('ErroSalvamentoNarrativo é instância de Error', async () => {
    const { storage } = criarStorage({});
    let erro: unknown = null;
    try {
      await executarSalvamentoNarrativo([alt('', null, 1)], storage);
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(Error);
    expect(erro).toBeInstanceOf(ErroSalvamentoNarrativo);
  });
});

// ─── descreverErroSalvamentoNarrativo ─────────────────────────────────────────

describe('descreverErroSalvamentoNarrativo', () => {
  function erroPrep(causa: unknown, fp = 'a.md'): ErroSalvamentoNarrativo {
    return new ErroSalvamentoNarrativo('preparacao', fp, causa, 'Falha ao preparar.');
  }

  it('frontmatter ausente — título, mensagem e ação corretos', () => {
    const causa = new ErroPatchFrontmatterEvento('frontmatter_ausente', '', 'sem fm');
    const desc = descreverErroSalvamentoNarrativo(erroPrep(causa, 'nota.md'));
    expect(desc.titulo).toBe('Nota sem frontmatter');
    expect(desc.mensagem).toContain('não possui bloco YAML');
    expect(desc.acaoSugerida).toContain('Estruture');
  });

  it('frontmatter inválido — título correto', () => {
    const causa = new ErroPatchFrontmatterEvento('frontmatter_invalido', '', 'inv');
    const desc = descreverErroSalvamentoNarrativo(erroPrep(causa));
    expect(desc.titulo).toBe('Frontmatter inválido');
  });

  it('chave duplicada — título correto', () => {
    const causa = new ErroPatchFrontmatterEvento('chave_duplicada', 'capitulo', 'dup');
    const desc = descreverErroSalvamentoNarrativo(erroPrep(causa));
    expect(desc.titulo).toBe('Campo duplicado no frontmatter');
  });

  it('valor inválido — título correto', () => {
    const causa = new ErroPatchFrontmatterEvento('valor_invalido', 'ordem_narrativa', 'inv');
    const desc = descreverErroSalvamentoNarrativo(erroPrep(causa));
    expect(desc.titulo).toBe('Valor narrativo inválido');
  });

  it('falha de leitura — título e etapa corretos', () => {
    const erro = new ErroSalvamentoNarrativo('leitura', 'x.md', new Error('io'), 'Falha leitura');
    const desc = descreverErroSalvamentoNarrativo(erro);
    expect(desc.titulo).toBe('Falha ao ler nota');
    expect(desc.etapa).toBe('leitura');
  });

  it('falha de escrita — título e etapa corretos', () => {
    const erro = new ErroSalvamentoNarrativo('escrita', 'y.md', new Error('io'), 'Falha escrita');
    const desc = descreverErroSalvamentoNarrativo(erro);
    expect(desc.titulo).toBe('Falha ao escrever nota');
    expect(desc.etapa).toBe('escrita');
  });

  it('falha de reversão — título e etapa corretos', () => {
    const erro = new ErroSalvamentoNarrativo('reversao', 'z.md', new Error('io'), 'Falha reversão');
    const desc = descreverErroSalvamentoNarrativo(erro);
    expect(desc.titulo).toBe('Falha na reversão');
    expect(desc.etapa).toBe('reversao');
  });

  it('erro desconhecido — título genérico com mensagem do erro', () => {
    const desc = descreverErroSalvamentoNarrativo(new Error('erro inesperado xyz'));
    expect(desc.titulo).toBe('Erro inesperado');
    expect(desc.mensagem).toContain('erro inesperado xyz');
  });

  it('preservação de caminho — filePath correto na descrição', () => {
    const causa = new ErroPatchFrontmatterEvento('frontmatter_ausente', '', 'sem fm');
    const desc = descreverErroSalvamentoNarrativo(erroPrep(causa, '05_Eventos/E-X Bartolo.md'));
    expect(desc.filePath).toBe('05_Eventos/E-X Bartolo.md');
  });

  it('resultado novo — cada chamada retorna objeto diferente', () => {
    const erro = new ErroSalvamentoNarrativo('leitura', 'a.md', null, 'Falha');
    const d1 = descreverErroSalvamentoNarrativo(erro);
    const d2 = descreverErroSalvamentoNarrativo(erro);
    expect(d1).not.toBe(d2);
  });

  it('sem stack trace — mensagem não expõe pilha de chamadas', () => {
    const causa = new Error('causa real');
    causa.stack = 'Error: causa real\n    at Object.<anonymous> (foo.ts:1:1)';
    const erro = new ErroSalvamentoNarrativo('leitura', 'a.md', causa, 'Falha');
    const desc = descreverErroSalvamentoNarrativo(erro);
    expect(desc.mensagem).not.toContain('at Object');
    expect(desc.mensagem).not.toContain('foo.ts');
  });
});
