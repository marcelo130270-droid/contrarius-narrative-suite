import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseYaml } from 'obsidian';
import { normalizarConsciencia } from '../../../src/contrarius/entities/consciencia';

const FIXTURE_PATH = resolve(process.cwd(), 'test/contrarius/__fixtures__/consciencia-basica.md');

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
const FIXTURE_FILE_PATH = '02_Consciencias/consciencia-basica.md';

describe('normalizarConsciencia — fixture consciencia-basica.md', () => {
  it('1. tipoEntidade é "consciencia"', () => {
    const result = normalizarConsciencia(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.tipoEntidade).toBe('consciencia');
  });

  it('2. id usa o basename quando não existe propriedade id', () => {
    const result = normalizarConsciencia(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.id).toBe('consciencia-basica');
  });

  it('3. id explícito tem precedência sobre o basename', () => {
    const fm = { ...fixtureFm, id: 'meu-id-explicito' };
    const result = normalizarConsciencia(fm, FIXTURE_FILE_PATH);
    expect(result.id).toBe('meu-id-explicito');
  });

  it('4. nome é normalizado', () => {
    const result = normalizarConsciencia(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.nome).toBe('Thalion Brenn');
  });

  it('5. ident_extraf torna-se identExtraf string', () => {
    const result = normalizarConsciencia(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.identExtraf).toBe('O Andarilho');
    expect(typeof result.identExtraf).toBe('string');
  });

  it('6. nucleo_geo torna-se nucleoGeo lista', () => {
    const result = normalizarConsciencia(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.nucleoGeo).toEqual(['Europa Média', 'Mediterrâneo']);
  });

  it('7. religiao torna-se lista', () => {
    const result = normalizarConsciencia(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.religiao).toEqual(['Estoicismo']);
  });

  it('8. holopensenes torna-se lista', () => {
    const result = normalizarConsciencia(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.holopensenes).toEqual(['coragem', 'serenidade']);
  });

  it('9. grupocarma remove links Obsidian', () => {
    const result = normalizarConsciencia(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.grupocarma).toEqual(['G-017', 'G-022']);
  });

  it('10. grupo_karmico funciona como alias legado de grupocarma', () => {
    const fm: Record<string, unknown> = {
      nome: 'X',
      grupo_karmico: ['[[G-099]]', '[[G-100]]'],
    };
    const result = normalizarConsciencia(fm, 'test/arquivo.md');
    expect(result.grupocarma).toEqual(['G-099', 'G-100']);
  });

  it('11. reaparece permanece booleano', () => {
    const result = normalizarConsciencia(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.reaparece).toBe(true);
    expect(typeof result.reaparece).toBe('boolean');
  });

  it('12. campo desconhecido aparece em camposDesconhecidos', () => {
    const result = normalizarConsciencia(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.camposDesconhecidos['campo_extra']).toBe('valor-ficticio');
  });

  it('13. campos conhecidos não aparecem em camposDesconhecidos', () => {
    const result = normalizarConsciencia(fixtureFm, FIXTURE_FILE_PATH);
    const conhecidos = ['tipo', 'nome', 'ident_extraf', 'identExtraf', 'nucleo_geo', 'nucleoGeo',
      'religiao', 'holopensenes', 'grupocarma', 'grupo_karmico', 'reaparece', 'id'];
    for (const campo of conhecidos) {
      expect(Object.prototype.hasOwnProperty.call(result.camposDesconhecidos, campo)).toBe(false);
    }
  });

  it('14. frontmatterRaw preserva as propriedades originais', () => {
    const result = normalizarConsciencia(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.frontmatterRaw['grupocarma']).toEqual(['[[G-017]]', '[[G-022]]']);
    expect(result.frontmatterRaw['nome']).toBe('Thalion Brenn');
    expect(result.frontmatterRaw['reaparece']).toBe(true);
  });

  it('15. a função não modifica o objeto frontmatter recebido', () => {
    const fm: Record<string, unknown> = {
      nome: 'Imutavel',
      grupocarma: ['[[G-001]]'],
      reaparece: false,
    };
    const snapshot = JSON.stringify(fm);
    normalizarConsciencia(fm, 'test/imutavel.md');
    expect(JSON.stringify(fm)).toBe(snapshot);
  });

  it('16. arrays em frontmatterRaw são cópias independentes do frontmatter original', () => {
    const fm: Record<string, unknown> = {
      nome: 'Copia',
      grupocarma: ['[[G-001]]', '[[G-002]]'],
    };
    const result = normalizarConsciencia(fm, 'test/copia.md');
    (result.frontmatterRaw['grupocarma'] as string[]).push('extra');
    expect((fm['grupocarma'] as string[]).length).toBe(2);
  });

  it('17. arrays em camposDesconhecidos são cópias independentes do frontmatter original', () => {
    const fm: Record<string, unknown> = {
      nome: 'CopiaDesc',
      campo_lista_extra: ['a', 'b'],
    };
    const result = normalizarConsciencia(fm, 'test/copia-desc.md');
    (result.camposDesconhecidos['campo_lista_extra'] as string[]).push('c');
    expect((fm['campo_lista_extra'] as string[]).length).toBe(2);
  });

  it('18. nome ausente com basename válido usa o basename como nome de exibição sem aviso genérico', () => {
    const fm: Record<string, unknown> = { reaparece: true };
    const result = normalizarConsciencia(fm, 'test/sem-nome.md');
    expect(result.nome).toBe('sem-nome');
    expect(result.avisos.some((a) => a.includes('nome'))).toBe(false);
  });

  it('19. caminhos Windows com \\ produzem basename correto', () => {
    const fm: Record<string, unknown> = { nome: 'X' };
    const result = normalizarConsciencia(fm, '02_Consciencias\\C-001_Contrarius_Enantios.md');
    expect(result.id).toBe('C-001_Contrarius_Enantios');
  });

  it('20. caminhos com / produzem basename correto', () => {
    const fm: Record<string, unknown> = { nome: 'X' };
    const result = normalizarConsciencia(fm, '02_Consciencias/C-001_Contrarius_Enantios.md');
    expect(result.id).toBe('C-001_Contrarius_Enantios');
  });

  it('21. caminho sem extensão .md não perde caracteres', () => {
    const fm: Record<string, unknown> = { nome: 'X' };
    const result = normalizarConsciencia(fm, '02_Consciencias/C-001.txt');
    expect(result.id).toBe('C-001.txt');
  });

  it('22. campos ausentes resultam nos padrões: basename como nome, listas vazias, reaparece false', () => {
    const fm: Record<string, unknown> = {};
    const result = normalizarConsciencia(fm, 'test/vazio.md');
    expect(result.nome).toBe('vazio');
    expect(result.identExtraf).toBe('');
    expect(result.nucleoGeo).toEqual([]);
    expect(result.religiao).toEqual([]);
    expect(result.holopensenes).toEqual([]);
    expect(result.grupocarma).toEqual([]);
    expect(result.reaparece).toBe(false);
  });
});

describe('normalizarConsciencia — fallback de basename para nome (requisitos 1–4)', () => {
  it('1. Consciência sem campo nome usa o basename do arquivo como nome de exibição', () => {
    const result = normalizarConsciencia({}, '02_Consciencias/C-001_Contrarius_Enantios.md');
    expect(result.nome).toBe('C-001_Contrarius_Enantios');
  });

  it('2. Consciência sem nome com basename válido não recebe o aviso genérico de nome ausente', () => {
    const result = normalizarConsciencia({}, '02_Consciencias/C-001_Contrarius_Enantios.md');
    expect(result.avisos.some((a) => a.includes('nome'))).toBe(false);
  });

  it('3. Campo nome no frontmatter tem precedência sobre o basename', () => {
    const result = normalizarConsciencia(
      { nome: 'Thalion' },
      '02_Consciencias/C-001_Contrarius_Enantios.md',
    );
    expect(result.nome).toBe('Thalion');
  });

  it('4. O id estável não é alterado pelo fallback de nome', () => {
    const resultSemId = normalizarConsciencia({}, '02_Consciencias/C-001_Contrarius_Enantios.md');
    expect(resultSemId.id).toBe('C-001_Contrarius_Enantios');
    const resultComId = normalizarConsciencia(
      { id: 'C-001' },
      '02_Consciencias/C-001_Contrarius_Enantios.md',
    );
    expect(resultComId.id).toBe('C-001');
    expect(resultComId.nome).toBe('C-001_Contrarius_Enantios');
  });

  it('aviso de nome ausente é emitido somente quando o basename também está vazio', () => {
    const result = normalizarConsciencia({}, '');
    expect(result.nome).toBe('');
    expect(result.avisos.some((a) => a.includes('nome'))).toBe(true);
  });
});

describe('normalizarConsciencia — casos adicionais', () => {
  it('grupocarma tem precedência sobre grupo_karmico quando ambos presentes', () => {
    const fm: Record<string, unknown> = {
      nome: 'Y',
      grupocarma: ['[[G-001]]'],
      grupo_karmico: ['[[G-999]]'],
    };
    const result = normalizarConsciencia(fm, 'test/duplo.md');
    expect(result.grupocarma).toEqual(['G-001']);
  });

  it('identExtraf alias camelCase (identExtraf) funciona quando ident_extraf ausente', () => {
    const fm: Record<string, unknown> = { nome: 'Z', identExtraf: 'Alias Camel' };
    const result = normalizarConsciencia(fm, 'test/camel.md');
    expect(result.identExtraf).toBe('Alias Camel');
  });

  it('nucleoGeo alias camelCase funciona quando nucleo_geo ausente', () => {
    const fm: Record<string, unknown> = { nome: 'W', nucleoGeo: ['Ásia'] };
    const result = normalizarConsciencia(fm, 'test/geo-camel.md');
    expect(result.nucleoGeo).toEqual(['Ásia']);
  });

  it('filePath é preservado no resultado', () => {
    const fm: Record<string, unknown> = { nome: 'Preservado' };
    const path = '02_Consciencias/preservado.md';
    const result = normalizarConsciencia(fm, path);
    expect(result.filePath).toBe(path);
  });

  it('avisos é array vazio quando todos os campos principais estão presentes', () => {
    const result = normalizarConsciencia(fixtureFm, FIXTURE_FILE_PATH);
    expect(result.avisos).toEqual([]);
  });
});
