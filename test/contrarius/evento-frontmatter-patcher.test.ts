import { describe, expect, it } from 'vitest';
import {
  aplicarPatchNarrativoEvento,
  ErroPatchFrontmatterEvento,
  type ValoresNarrativosEvento,
} from '../../src/contrarius/evento-frontmatter-patcher';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function v(ordemNarrativa: number | null, capitulo: string, cena: string): ValoresNarrativosEvento {
  return { ordemNarrativa, capitulo, cena };
}

/** Retorna o conteúdo da linha que começa com o prefixo dado (sem CR). */
function linha(conteudo: string, prefixo: string): string | undefined {
  return conteudo
    .split('\n')
    .map((l) => l.replace(/\r$/, ''))
    .find((l) => l.startsWith(prefixo));
}

function getBody(conteudo: string): string {
  const idx = conteudo.indexOf('\n---\n');
  if (idx === -1) return '';
  return conteudo.slice(idx + 5);
}

const FM_COMPLETO = '---\nordem_narrativa: 1\ncapitulo: Cap\ncena: Cena\n---\n';

// ─── 1–3. Quebras de linha e BOM ──────────────────────────────────────────────

describe('aplicarPatchNarrativoEvento — line endings', () => {
  // 1. LF
  it('preserva LF sem introduzir CR', () => {
    const conteudo = '---\ntitulo: test\n---\n';
    const { conteudo: result } = aplicarPatchNarrativoEvento(conteudo, v(1, 'Cap', 'Cena'));
    expect(result).not.toContain('\r');
  });

  // 2. CRLF
  it('preserva CRLF em todos os novos campos adicionados', () => {
    const conteudo = '---\r\ntitulo: test\r\n---\r\n';
    const { conteudo: result } = aplicarPatchNarrativoEvento(conteudo, v(1, 'Cap', 'Cena'));
    const lfs = (result.match(/\n/g) ?? []).length;
    const crlfs = (result.match(/\r\n/g) ?? []).length;
    expect(crlfs).toBe(lfs);
  });

  // 3. BOM
  it('preserva BOM UTF-8 no início do resultado', () => {
    const BOM = String.fromCharCode(0xfeff);
    const conteudo = BOM + '---\ntitulo: test\n---\n';
    const { conteudo: result } = aplicarPatchNarrativoEvento(conteudo, v(1, 'Cap', 'Cena'));
    expect(result.charCodeAt(0)).toBe(0xfeff);
  });
});

// ─── 4. Corpo preservado ──────────────────────────────────────────────────────

describe('aplicarPatchNarrativoEvento — corpo', () => {
  // 4. Corpo preservado
  it('preserva o corpo após o frontmatter sem alterações', () => {
    const body = 'Linha 1\nLinha 2\n\nParágrafo.\n';
    const conteudo = `---\ntitulo: test\n---\n${body}`;
    const { conteudo: result } = aplicarPatchNarrativoEvento(conteudo, v(1, 'Cap', 'Cena'));
    expect(getBody(result)).toBe(body);
  });

  it('preserva corpo vazio', () => {
    const conteudo = '---\ntitulo: test\n---\n';
    const { conteudo: result } = aplicarPatchNarrativoEvento(conteudo, v(1, 'Cap', 'Cena'));
    expect(result.endsWith('\n')).toBe(true);
  });
});

// ─── 5–8. Atualização e inserção de campos ────────────────────────────────────

describe('aplicarPatchNarrativoEvento — atualização de campos', () => {
  // 5. Atualização das chaves canônicas
  it('atualiza chave canônica ordem_narrativa existente', () => {
    const conteudo = '---\nordem_narrativa: 5\ncapitulo: Cap\ncena: Cena\n---\n';
    const { conteudo: result, camposAlterados } = aplicarPatchNarrativoEvento(conteudo, v(10, 'Cap', 'Cena'));
    expect(linha(result, 'ordem_narrativa')).toBe('ordem_narrativa: 10');
    expect(camposAlterados).toContain('ordem_narrativa');
  });

  it('atualiza chave canônica capitulo existente', () => {
    const conteudo = '---\nordem_narrativa: 1\ncapitulo: Velho\ncena: Cena\n---\n';
    const { conteudo: result } = aplicarPatchNarrativoEvento(conteudo, v(1, 'Novo', 'Cena'));
    expect(linha(result, 'capitulo')).toBe('capitulo: Novo');
  });

  it('atualiza chave canônica cena existente', () => {
    const conteudo = '---\nordem_narrativa: 1\ncapitulo: Cap\ncena: Velha\n---\n';
    const { conteudo: result } = aplicarPatchNarrativoEvento(conteudo, v(1, 'Cap', 'Nova'));
    expect(linha(result, 'cena')).toBe('cena: Nova');
  });

  // 6. Atualização de cada alias
  it('atualiza alias ordemNarrativa (camelCase) no lugar', () => {
    const conteudo = '---\nordemNarrativa: 5\ncapitulo: Cap\ncena: Cena\n---\n';
    const { conteudo: result } = aplicarPatchNarrativoEvento(conteudo, v(10, 'Cap', 'Cena'));
    expect(linha(result, 'ordemNarrativa')).toBe('ordemNarrativa: 10');
    expect(result).not.toContain('ordem_narrativa:');
  });

  it('atualiza alias capítulo (com acento) no lugar', () => {
    const conteudo = '---\nordem_narrativa: 1\ncapítulo: Velho\ncena: Cena\n---\n';
    const { conteudo: result } = aplicarPatchNarrativoEvento(conteudo, v(1, 'Novo', 'Cena'));
    expect(linha(result, 'capítulo')).toBe('capítulo: Novo');
    expect(result).not.toContain('capitulo:');
  });

  // 7. Inclusão de campos ausentes
  it('acrescenta os três campos quando ausentes', () => {
    const conteudo = '---\ntitulo: test\n---\n';
    const { conteudo: result, camposAlterados } = aplicarPatchNarrativoEvento(conteudo, v(1, 'Cap', 'Cena'));
    expect(linha(result, 'ordem_narrativa')).toBe('ordem_narrativa: 1');
    expect(linha(result, 'capitulo')).toBe('capitulo: Cap');
    expect(linha(result, 'cena')).toBe('cena: Cena');
    expect(camposAlterados).toEqual(['ordem_narrativa', 'capitulo', 'cena']);
  });

  it('acrescenta somente campos ausentes quando parte já existe', () => {
    const conteudo = '---\nordem_narrativa: 1\ntitulo: test\n---\n';
    const { conteudo: result, camposAlterados } = aplicarPatchNarrativoEvento(conteudo, v(1, 'Cap', 'Cena'));
    expect(camposAlterados).not.toContain('ordem_narrativa');
    expect(camposAlterados).toContain('capitulo');
    expect(camposAlterados).toContain('cena');
    // ordem_narrativa não deve aparecer duplicado
    const ordLinhas = result.split('\n').filter((l) => /^ordem_narrativa\s*:/.test(l.replace(/\r$/, '')));
    expect(ordLinhas).toHaveLength(1);
  });

  // 8. Ordem canônica dos campos adicionados
  it('adiciona campos ausentes na ordem canônica', () => {
    const conteudo = '---\ntitulo: test\n---\n';
    const { conteudo: result } = aplicarPatchNarrativoEvento(conteudo, v(1, 'Cap', 'Cena'));
    const ordIdx = result.indexOf('ordem_narrativa:');
    const capIdx = result.indexOf('capitulo:');
    const cenIdx = result.indexOf('cena:');
    expect(ordIdx).toBeGreaterThan(-1);
    expect(capIdx).toBeGreaterThan(-1);
    expect(cenIdx).toBeGreaterThan(-1);
    expect(ordIdx).toBeLessThan(capIdx);
    expect(capIdx).toBeLessThan(cenIdx);
  });
});

// ─── 9–13. Erros estruturais ──────────────────────────────────────────────────

describe('aplicarPatchNarrativoEvento — erros estruturais', () => {
  // 9. Ausência de frontmatter
  it('lança frontmatter_ausente quando o arquivo não começa com ---', () => {
    expect(() => aplicarPatchNarrativoEvento('corpo\n---\n', v(1, 'Cap', 'Cena')))
      .toThrow(ErroPatchFrontmatterEvento);
    try {
      aplicarPatchNarrativoEvento('corpo\n---\n', v(1, 'Cap', 'Cena'));
    } catch (e) {
      expect((e as ErroPatchFrontmatterEvento).codigo).toBe('frontmatter_ausente');
    }
  });

  it('lança frontmatter_ausente para arquivo vazio', () => {
    expect(() => aplicarPatchNarrativoEvento('', v(1, 'Cap', 'Cena'))).toThrow(ErroPatchFrontmatterEvento);
  });

  // 10. Fechamento ausente
  it('lança frontmatter_invalido quando não há fechamento ---', () => {
    try {
      aplicarPatchNarrativoEvento('---\ntitulo: test\n', v(1, 'Cap', 'Cena'));
      expect.fail('deveria ter lançado');
    } catch (e) {
      expect((e as ErroPatchFrontmatterEvento).codigo).toBe('frontmatter_invalido');
    }
  });

  // 11. Alias duplicado
  it('lança chave_duplicada quando dois aliases do mesmo campo coexistem', () => {
    const conteudo = '---\nordem_narrativa: 1\nordemNarrativa: 2\ncapitulo: Cap\ncena: Cena\n---\n';
    try {
      aplicarPatchNarrativoEvento(conteudo, v(1, 'Cap', 'Cena'));
      expect.fail('deveria ter lançado');
    } catch (e) {
      expect((e as ErroPatchFrontmatterEvento).codigo).toBe('chave_duplicada');
      expect((e as ErroPatchFrontmatterEvento).campo).toBe('ordem_narrativa');
    }
  });

  // 12. Chave repetida
  it('lança chave_duplicada quando a mesma chave aparece duas vezes', () => {
    const conteudo = '---\ncapitulo: A\ncapitulo: B\nordem_narrativa: 1\ncena: Cena\n---\n';
    try {
      aplicarPatchNarrativoEvento(conteudo, v(1, 'A', 'Cena'));
      expect.fail('deveria ter lançado');
    } catch (e) {
      expect((e as ErroPatchFrontmatterEvento).codigo).toBe('chave_duplicada');
      expect((e as ErroPatchFrontmatterEvento).campo).toBe('capitulo');
    }
  });

  // 13. Chave indentada ignorada
  it('não trata chave indentada como campo de nível superior', () => {
    const conteudo = '---\ntitulo: test\ndata:\n  cena: nested\n---\n';
    const { conteudo: result } = aplicarPatchNarrativoEvento(conteudo, v(null, '', 'Real'));
    // A linha indentada deve ser preservada
    expect(result).toContain('  cena: nested');
    // E uma linha de nível superior cena: deve ser adicionada
    const topLevelCena = result
      .split('\n')
      .map((l) => l.replace(/\r$/, ''))
      .filter((l) => /^cena\s*:/.test(l));
    expect(topLevelCena).toHaveLength(1);
    expect(topLevelCena[0]).toBe('cena: Real');
  });
});

// ─── 14–20. Serialização de ordemNarrativa ────────────────────────────────────

describe('aplicarPatchNarrativoEvento — serialização de ordemNarrativa', () => {
  // 14. Inteiro
  it('serializa inteiro positivo como número YAML simples', () => {
    const { conteudo: result } = aplicarPatchNarrativoEvento(FM_COMPLETO, v(42, 'Cap', 'Cena'));
    expect(linha(result, 'ordem_narrativa')).toBe('ordem_narrativa: 42');
  });

  // 15. Zero
  it('serializa zero como 0', () => {
    const { conteudo: result } = aplicarPatchNarrativoEvento(FM_COMPLETO, v(0, 'Cap', 'Cena'));
    expect(linha(result, 'ordem_narrativa')).toBe('ordem_narrativa: 0');
  });

  // 16. Negativo
  it('serializa inteiro negativo', () => {
    const { conteudo: result } = aplicarPatchNarrativoEvento(FM_COMPLETO, v(-5, 'Cap', 'Cena'));
    expect(linha(result, 'ordem_narrativa')).toBe('ordem_narrativa: -5');
  });

  // 17. null como vazio
  it('serializa null como valor vazio após os dois-pontos', () => {
    const conteudo = '---\nordem_narrativa: 5\ncapitulo: Cap\ncena: Cena\n---\n';
    const { conteudo: result } = aplicarPatchNarrativoEvento(conteudo, v(null, 'Cap', 'Cena'));
    expect(linha(result, 'ordem_narrativa')).toBe('ordem_narrativa:');
  });

  // 18. NaN
  it('lança valor_invalido para NaN', () => {
    try {
      aplicarPatchNarrativoEvento(FM_COMPLETO, v(NaN, 'Cap', 'Cena'));
      expect.fail('deveria ter lançado');
    } catch (e) {
      expect((e as ErroPatchFrontmatterEvento).codigo).toBe('valor_invalido');
      expect((e as ErroPatchFrontmatterEvento).campo).toBe('ordem_narrativa');
    }
  });

  // 19. Infinito
  it('lança valor_invalido para Infinity', () => {
    try {
      aplicarPatchNarrativoEvento(FM_COMPLETO, v(Infinity, 'Cap', 'Cena'));
      expect.fail('deveria ter lançado');
    } catch (e) {
      expect((e as ErroPatchFrontmatterEvento).codigo).toBe('valor_invalido');
    }
  });

  // 20. Decimal
  it('lança valor_invalido para decimal', () => {
    try {
      aplicarPatchNarrativoEvento(FM_COMPLETO, v(3.14, 'Cap', 'Cena'));
      expect.fail('deveria ter lançado');
    } catch (e) {
      expect((e as ErroPatchFrontmatterEvento).codigo).toBe('valor_invalido');
    }
  });
});

// ─── 21–35. Serialização de textos ───────────────────────────────────────────

describe('aplicarPatchNarrativoEvento — serialização de textos', () => {
  function testCap(valor: string): string {
    const conteudo = '---\nordem_narrativa: 1\ncapitulo: X\ncena: Y\n---\n';
    const { conteudo: result } = aplicarPatchNarrativoEvento(conteudo, v(1, valor, 'Y'));
    return linha(result, 'capitulo') ?? '';
  }

  // 21. Strings simples
  it('serializa string simples sem aspas', () => {
    expect(testCap('Capítulo Introdutório')).toBe('capitulo: Capítulo Introdutório');
  });

  // 22. Trim
  it('aplica trim no valor de capitulo e cena', () => {
    expect(testCap('  Capítulo  ')).toBe('capitulo: Capítulo');
  });

  // 23. String vazia
  it('serializa string vazia como valor vazio', () => {
    expect(testCap('')).toBe('capitulo:');
  });

  // 24. Dois-pontos
  it('cita string com dois-pontos', () => {
    const val = 'Cap: Intro';
    expect(testCap(val)).toBe('capitulo: ' + JSON.stringify(val));
  });

  // 25. Comentário #
  it('cita string com hash (#)', () => {
    const val = 'Cap #1';
    expect(testCap(val)).toBe('capitulo: ' + JSON.stringify(val));
  });

  // 26. Aspas
  it('cita string com aspas duplas', () => {
    const val = 'Diz "olá"';
    const l = testCap(val);
    expect(l.startsWith('capitulo: "')).toBe(true);
    expect(l).toBe('capitulo: ' + JSON.stringify(val));
  });

  it('cita string com aspas simples', () => {
    const val = "it's here";
    expect(testCap(val)).toBe('capitulo: ' + JSON.stringify(val));
  });

  // 27. Barras
  it('cita string com barra normal', () => {
    const val = 'Parte/Arquivo';
    expect(testCap(val)).toBe('capitulo: ' + JSON.stringify(val));
  });

  it('cita string com barra invertida', () => {
    const val = 'Pasta\\Arquivo';
    expect(testCap(val)).toBe('capitulo: ' + JSON.stringify(val));
  });

  // 28. Colchetes e chaves
  it('cita string com colchetes', () => {
    const val = '[item]';
    expect(testCap(val)).toBe('capitulo: ' + JSON.stringify(val));
  });

  it('cita string com chaves', () => {
    const val = '{chave: valor}';
    expect(testCap(val)).toBe('capitulo: ' + JSON.stringify(val));
  });

  // 29. Boolean aparente
  it('cita string que parece boolean true', () => {
    expect(testCap('true')).toBe('capitulo: "true"');
  });

  it('cita string que parece boolean false', () => {
    expect(testCap('false')).toBe('capitulo: "false"');
  });

  it('cita string yes/no', () => {
    expect(testCap('yes')).toBe('capitulo: "yes"');
    expect(testCap('no')).toBe('capitulo: "no"');
  });

  // 30. Null aparente
  it('cita string null', () => {
    expect(testCap('null')).toBe('capitulo: "null"');
  });

  it('cita string ~ (null YAML)', () => {
    expect(testCap('~')).toBe('capitulo: ' + JSON.stringify('~'));
  });

  // 31. Número aparente
  it('cita string que parece número', () => {
    expect(testCap('42')).toBe('capitulo: "42"');
    expect(testCap('3.14')).toBe('capitulo: "3.14"');
    expect(testCap('-5')).toBe('capitulo: ' + JSON.stringify('-5'));
  });

  // 32. Data aparente
  it('cita string que parece data ISO', () => {
    expect(testCap('2023-01-15')).toBe('capitulo: "2023-01-15"');
  });

  // 33. Quebra de linha
  it('não produz múltiplas linhas para valor com quebra de linha', () => {
    const val = 'Linha 1\nLinha 2';
    const l = testCap(val);
    expect(l.startsWith('capitulo: "')).toBe(true);
    expect(l).toBe('capitulo: ' + JSON.stringify(val));
    // O resultado não deve conter linha real (apenas \n escapado)
    expect(l.includes('\n')).toBe(false);
  });

  // 34. Tab
  it('cita string com tab', () => {
    const val = 'Col\tTab';
    expect(testCap(val)).toBe('capitulo: ' + JSON.stringify(val));
  });

  // 35. Unicode
  it('preserva texto Unicode sem necessidade de quoting desnecessário', () => {
    const val = 'Capítulo com Ações Über';
    expect(testCap(val)).toBe('capitulo: Capítulo com Ações Über');
  });
});

// ─── 36–40. Correção e idempotência ──────────────────────────────────────────

describe('aplicarPatchNarrativoEvento — correção e idempotência', () => {
  // 36. Nenhum undefined ou [object Object]
  it('nunca produz "undefined" ou "[object Object]" no conteúdo', () => {
    const { conteudo: result } = aplicarPatchNarrativoEvento('---\ntitulo: test\n---\n', v(null, '', ''));
    expect(result).not.toContain('undefined');
    expect(result).not.toContain('[object Object]');
    expect(result).not.toContain('NaN');
    expect(result).not.toContain('Infinity');
  });

  // 37. Arquivo já equivalente
  it('não altera o arquivo quando todos os campos já têm os valores corretos', () => {
    const conteudo = '---\nordem_narrativa: 5\ncapitulo: Cap\ncena: Cena\n---\n';
    const { conteudo: result, alterado, camposAlterados } = aplicarPatchNarrativoEvento(
      conteudo,
      v(5, 'Cap', 'Cena'),
    );
    expect(alterado).toBe(false);
    expect(camposAlterados).toHaveLength(0);
    expect(result).toBe(conteudo);
  });

  it('marca como alterado quando apenas um campo muda', () => {
    const conteudo = '---\nordem_narrativa: 5\ncapitulo: Cap\ncena: Cena\n---\n';
    const { alterado, camposAlterados } = aplicarPatchNarrativoEvento(conteudo, v(6, 'Cap', 'Cena'));
    expect(alterado).toBe(true);
    expect(camposAlterados).toEqual(['ordem_narrativa']);
  });

  // 38. camposAlterados exatos
  it('camposAlterados lista apenas os campos realmente alterados na ordem canônica', () => {
    const conteudo = '---\nordem_narrativa: 1\ncapitulo: Cap\ncena: Velha\n---\n';
    const { camposAlterados } = aplicarPatchNarrativoEvento(conteudo, v(1, 'Cap', 'Nova'));
    expect(camposAlterados).toEqual(['cena']);
  });

  it('camposAlterados respeita a ordem canônica quando múltiplos campos mudam', () => {
    const conteudo = '---\nordem_narrativa: 1\ncapitulo: A\ncena: B\n---\n';
    const { camposAlterados } = aplicarPatchNarrativoEvento(conteudo, v(2, 'C', 'D'));
    expect(camposAlterados).toEqual(['ordem_narrativa', 'capitulo', 'cena']);
  });

  // 39. Outros campos e comentários preservados
  it('preserva outros campos e comentários do frontmatter sem alterações', () => {
    const conteudo = '---\ntitulo: Original\n# este é um comentário\ndata: 2023-01-01\nnatureza: física\n---\n';
    const { conteudo: result } = aplicarPatchNarrativoEvento(conteudo, v(1, 'Cap', 'Cena'));
    expect(result).toContain('titulo: Original');
    expect(result).toContain('# este é um comentário');
    expect(result).toContain('data: 2023-01-01');
    expect(result).toContain('natureza: física');
  });

  // 40. Chamadas repetidas equivalentes
  it('chamadas repetidas com as mesmas entradas produzem resultados idênticos', () => {
    const conteudo = '---\ntitulo: test\n---\ncorpo\n';
    const r1 = aplicarPatchNarrativoEvento(conteudo, v(5, 'Cap', 'Cena'));
    const r2 = aplicarPatchNarrativoEvento(conteudo, v(5, 'Cap', 'Cena'));
    expect(r1.conteudo).toBe(r2.conteudo);
    expect(r1.alterado).toBe(r2.alterado);
    expect(r1.camposAlterados).toEqual(r2.camposAlterados);
  });

  it('aplicar o patch duas vezes no resultado é idempotente (arquivo já equivalente)', () => {
    const conteudo = '---\ntitulo: test\n---\n';
    const { conteudo: r1 } = aplicarPatchNarrativoEvento(conteudo, v(3, 'Cap', 'Cena'));
    const { conteudo: r2, alterado } = aplicarPatchNarrativoEvento(r1, v(3, 'Cap', 'Cena'));
    expect(r2).toBe(r1);
    expect(alterado).toBe(false);
  });
});
