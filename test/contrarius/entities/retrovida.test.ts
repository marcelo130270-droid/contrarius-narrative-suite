import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseYaml } from 'obsidian';
import { normalizarRetrovida } from '../../../src/contrarius/entities/retrovida';

const FIXTURE_PATH = resolve(process.cwd(), 'test/contrarius/__fixtures__/retrovida-completa.md');

function parseMdFrontmatter(content: string): Record<string, unknown> {
  const text = content.replace(/\r\n/g, '\n');
  const firstNl = text.indexOf('\n');
  if (firstNl === -1 || text.slice(0, firstNl) !== '---') return {};
  const body = text.slice(firstNl + 1);
  const lines = body.split('\n');
  const closingIdx = lines.findIndex((l) => l === '---');
  if (closingIdx === -1) return {};
  const yamlBlock = lines.slice(0, closingIdx).join('\n');
  return parseYaml(yamlBlock) as Record<string, unknown>;
}

const fixtureContent = readFileSync(FIXTURE_PATH, 'utf-8');
const fixtureFm = parseMdFrontmatter(fixtureContent);
const FIXTURE_FILE_PATH = '03_Retrovidas/__fixtures__/retrovida-completa.md';

describe('normalizarRetrovida — fixture retrovida-completa.md', () => {
  it('1. tipoEntidade é "retrovida"', () => {
    const result = normalizarRetrovida(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.tipoEntidade).toBe('retrovida');
  });

  it('2. id usa o basename quando não existe propriedade id', () => {
    const result = normalizarRetrovida(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.id).toBe('retrovida-completa');
  });

  it('3. id explícito tem precedência sobre o basename', () => {
    const fm = { ...fixtureFm, id: 'meu-id-explicito' };
    const result = normalizarRetrovida(fm, FIXTURE_FILE_PATH);
    expect(result.id).toBe('meu-id-explicito');
  });

  it('4. caminhos com / produzem basename correto', () => {
    const fm: Record<string, unknown> = {};
    const result = normalizarRetrovida(fm, '03_Retrovidas/C-101_V03_Pessoa_Ficticia.md');
    expect(result.id).toBe('C-101_V03_Pessoa_Ficticia');
  });

  it('5. caminhos com \\ produzem basename correto', () => {
    const fm: Record<string, unknown> = {};
    const result = normalizarRetrovida(fm, '03_Retrovidas\\C-101_V03_Pessoa_Ficticia.md');
    expect(result.id).toBe('C-101_V03_Pessoa_Ficticia');
  });

  it('6. caminho sem extensão .md não perde caracteres', () => {
    const fm: Record<string, unknown> = {};
    const result = normalizarRetrovida(fm, '03_Retrovidas/arquivo.txt');
    expect(result.id).toBe('arquivo.txt');
  });

  it('7. consc_id torna-se conscId', () => {
    const fm: Record<string, unknown> = { consc_id: 'C-042' };
    const result = normalizarRetrovida(fm, 'test/r.md');
    expect(result.conscId).toBe('C-042');
  });

  it('8. link Obsidian em consc_id é removido', () => {
    const result = normalizarRetrovida(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.conscId).toBe('C-042');
  });

  it('9. consc_id tem precedência sobre consciencia', () => {
    const fm: Record<string, unknown> = { consc_id: 'A', consciencia: 'B' };
    const result = normalizarRetrovida(fm, 'test/r.md');
    expect(result.conscId).toBe('A');
  });

  it('10. consciencia funciona como alias', () => {
    const fm: Record<string, unknown> = { consciencia: 'Aldric Soul' };
    const result = normalizarRetrovida(fm, 'test/r.md');
    expect(result.conscId).toBe('Aldric Soul');
  });

  it('11. vida textual é preservada', () => {
    const result = normalizarRetrovida(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.vida).toBe('V03');
  });

  it('12. vida numérica torna-se string', () => {
    const fm: Record<string, unknown> = { vida: 3 };
    const result = normalizarRetrovida(fm, 'test/r.md');
    expect(result.vida).toBe('3');
  });

  it('13. nomes torna-se lista', () => {
    const result = normalizarRetrovida(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.nomes).toEqual(['Aldric de Montfort', 'Aldric le Fort']);
  });

  it('14. nomes tem precedência sobre nome', () => {
    const fm: Record<string, unknown> = { nomes: ['X', 'Y'], nome: 'Z' };
    const result = normalizarRetrovida(fm, 'test/r.md');
    expect(result.nomes).toEqual(['X', 'Y']);
  });

  it('15. nome singular torna-se lista', () => {
    const fm: Record<string, unknown> = { nome: 'Único Nome' };
    const result = normalizarRetrovida(fm, 'test/r.md');
    expect(result.nomes).toEqual(['Único Nome']);
  });

  it('16. nascimento negativo é preservado', () => {
    const result = normalizarRetrovida(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.nascimento).toBe(-1250);
  });

  it('17. morte negativa é preservada', () => {
    const result = normalizarRetrovida(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.morte).toBe(-1198);
  });

  it('18. valores inválidos de nascimento e morte resultam em null', () => {
    const fm: Record<string, unknown> = { nascimento: 'abc', morte: 'invalido' };
    const result = normalizarRetrovida(fm, 'test/r.md');
    expect(result.nascimento).toBeNull();
    expect(result.morte).toBeNull();
  });

  it('19. livro singular torna-se lista', () => {
    const result = normalizarRetrovida(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.livro).toEqual(['Livro II']);
  });

  it('20. livro em lista permanece lista', () => {
    const fm: Record<string, unknown> = { livro: ['Livro I', 'Livro II'] };
    const result = normalizarRetrovida(fm, 'test/r.md');
    expect(result.livro).toEqual(['Livro I', 'Livro II']);
  });

  it('21. periodo singular torna-se lista', () => {
    const result = normalizarRetrovida(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.periodo).toEqual(['Sec XIII']);
  });

  it('22. nucleo_geo torna-se nucleoGeo', () => {
    const result = normalizarRetrovida(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.nucleoGeo).toEqual(['França Medieval', 'Provença']);
  });

  it('23. nucleoGeo funciona como alias', () => {
    const fm: Record<string, unknown> = { nucleoGeo: ['Ásia'] };
    const result = normalizarRetrovida(fm, 'test/r.md');
    expect(result.nucleoGeo).toEqual(['Ásia']);
  });

  it('24. mov_historico torna-se movHistorico', () => {
    const result = normalizarRetrovida(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.movHistorico).toEqual(['Cruzadas', 'Feudalismo']);
  });

  it('25. movHistorico funciona como alias', () => {
    const fm: Record<string, unknown> = { movHistorico: ['Renascimento'] };
    const result = normalizarRetrovida(fm, 'test/r.md');
    expect(result.movHistorico).toEqual(['Renascimento']);
  });

  it('26. pov tem precedência sobre historicidade', () => {
    const fm: Record<string, unknown> = { pov: 'interno', historicidade: 'externo' };
    const result = normalizarRetrovida(fm, 'test/r.md');
    expect(result.pov).toBe('interno');
  });

  it('27. historicidade funciona como alias', () => {
    const fm: Record<string, unknown> = { historicidade: 'externo' };
    const result = normalizarRetrovida(fm, 'test/r.md');
    expect(result.pov).toBe('externo');
  });

  it('28. holopensenes torna-se lista', () => {
    const result = normalizarRetrovida(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.holopensenes).toEqual(['devoção', 'lealdade']);
  });

  it('29. religiao torna-se lista', () => {
    const result = normalizarRetrovida(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.religiao).toEqual(['Catolicismo']);
  });

  it('30. classe_social torna-se classeSocial', () => {
    const result = normalizarRetrovida(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.classeSocial).toEqual(['nobreza']);
  });

  it('31. classeSocial funciona como alias', () => {
    const fm: Record<string, unknown> = { classeSocial: ['burguesia'] };
    const result = normalizarRetrovida(fm, 'test/r.md');
    expect(result.classeSocial).toEqual(['burguesia']);
  });

  it('32. campo desconhecido aparece em camposDesconhecidos', () => {
    const result = normalizarRetrovida(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.camposDesconhecidos['campo_extra_desconhecido']).toBe('valor-extra');
  });

  it('33. campos conhecidos não aparecem em camposDesconhecidos', () => {
    const result = normalizarRetrovida(fixtureFm, FIXTURE_FILE_PATH);
    const conhecidos = [
      'tipo', 'id', 'consc_id', 'consciencia', 'vida', 'nomes', 'nome',
      'nascimento', 'morte', 'livro', 'periodo', 'nucleo_geo', 'nucleoGeo',
      'mov_historico', 'movHistorico', 'pov', 'historicidade', 'holopensenes',
      'religiao', 'classe_social', 'classeSocial',
    ];
    for (const campo of conhecidos) {
      expect(Object.prototype.hasOwnProperty.call(result.camposDesconhecidos, campo)).toBe(false);
    }
  });

  it('34. frontmatterRaw preserva as propriedades originais', () => {
    const result = normalizarRetrovida(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.frontmatterRaw['consc_id']).toBe('[[C-042]]');
    expect(result.frontmatterRaw['vida']).toBe('V03');
    expect(result.frontmatterRaw['livro']).toBe('Livro II');
  });

  it('35. a função não modifica o objeto frontmatter recebido', () => {
    const fm: Record<string, unknown> = {
      consc_id: '[[C-001]]',
      nomes: ['Nome A'],
      vida: 'V01',
    };
    const snapshot = JSON.stringify(fm);
    normalizarRetrovida(fm, 'test/r.md');
    expect(JSON.stringify(fm)).toBe(snapshot);
  });

  it('36. arrays e objetos em frontmatterRaw são cópias independentes', () => {
    const fm: Record<string, unknown> = {
      nomes: ['Nome A', 'Nome B'],
    };
    const result = normalizarRetrovida(fm, 'test/r.md');
    (result.frontmatterRaw['nomes'] as string[]).push('Nome C');
    expect((fm['nomes'] as string[]).length).toBe(2);
  });

  it('37. arrays e objetos em camposDesconhecidos são cópias independentes', () => {
    const fm: Record<string, unknown> = {
      campo_lista_extra: ['alpha', 'beta'],
      campo_obj_extra: { chave: 'valor' },
    };
    const result = normalizarRetrovida(fm, 'test/r.md');
    (result.camposDesconhecidos['campo_lista_extra'] as string[]).push('gamma');
    (result.camposDesconhecidos['campo_obj_extra'] as Record<string, unknown>)['nova'] = true;
    expect((fm['campo_lista_extra'] as string[]).length).toBe(2);
    expect((fm['campo_obj_extra'] as Record<string, unknown>)['nova']).toBeUndefined();
  });

  it('38. ausência de conscId produz string vazia e aviso', () => {
    const fm: Record<string, unknown> = { vida: 'V01', nomes: ['X'] };
    const result = normalizarRetrovida(fm, 'test/r.md');
    expect(result.conscId).toBe('');
    expect(result.avisos.some((a) => a.includes('conscId'))).toBe(true);
  });

  it('39. ausência de vida produz string vazia e aviso', () => {
    const fm: Record<string, unknown> = { consc_id: 'C-001', nomes: ['X'] };
    const result = normalizarRetrovida(fm, 'test/r.md');
    expect(result.vida).toBe('');
    expect(result.avisos.some((a) => a.includes('vida'))).toBe(true);
  });

  it('40. ausência de nomes produz lista vazia e aviso', () => {
    const fm: Record<string, unknown> = { consc_id: 'C-001', vida: 'V01' };
    const result = normalizarRetrovida(fm, 'test/r.md');
    expect(result.nomes).toEqual([]);
    expect(result.avisos.some((a) => a.includes('nomes'))).toBe(true);
  });

  it('41. ausência de id e basename válido produz aviso', () => {
    const fm: Record<string, unknown> = {};
    const result = normalizarRetrovida(fm, '');
    expect(result.id).toBe('');
    expect(result.avisos.some((a) => a.includes('id'))).toBe(true);
  });

  it('42. campos ausentes produzem: strings vazias, listas vazias, nascimento null, morte null', () => {
    const fm: Record<string, unknown> = {};
    const result = normalizarRetrovida(fm, 'test/vazio.md');
    expect(result.conscId).toBe('');
    expect(result.vida).toBe('');
    expect(result.nomes).toEqual([]);
    expect(result.nascimento).toBeNull();
    expect(result.morte).toBeNull();
    expect(result.livro).toEqual([]);
    expect(result.periodo).toEqual([]);
    expect(result.nucleoGeo).toEqual([]);
    expect(result.movHistorico).toEqual([]);
    expect(result.pov).toBe('');
    expect(result.holopensenes).toEqual([]);
    expect(result.religiao).toEqual([]);
    expect(result.classeSocial).toEqual([]);
  });
});
