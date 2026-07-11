import { describe, expect, it } from 'vitest';
import {
  extrairItensPayloadContrariusScrivener,
  extrairItensPayloadColecaoContrariusScrivener,
} from '../../src/contrarius/scrivener-contrarius-payload-extractor';

describe('scrivener-contrarius-payload-extractor', () => {
  describe('extrairItensPayloadColecaoContrariusScrivener', () => {
    it('extrai consciencias mapeando tipo para consciencia', () => {
      const resultado = extrairItensPayloadColecaoContrariusScrivener('consciencias', [
        { id: 'c-1', titulo: 'Personagem A' },
      ]);
      expect(resultado.totalItens).toBe(1);
      expect(resultado.itens[0].tipo).toBe('consciencia');
      expect(resultado.itens[0].id).toBe('c-1');
      expect(resultado.itens[0].titulo).toBe('Personagem A');
    });

    it('extrai retrovidas mapeando tipo para retrovida', () => {
      const resultado = extrairItensPayloadColecaoContrariusScrivener('retrovidas', [
        { id: 'r-1', titulo: 'Retrovida B' },
      ]);
      expect(resultado.itens[0].tipo).toBe('retrovida');
    });

    it('extrai eventos mapeando tipo para evento', () => {
      const resultado = extrairItensPayloadColecaoContrariusScrivener('eventos', [
        { id_evento: 'ev-1', titulo: 'Grande Evento' },
      ]);
      expect(resultado.itens[0].tipo).toBe('evento');
      expect(resultado.itens[0].id).toBe('ev-1');
    });

    it('extrai lugares mapeando tipo para lugar', () => {
      const resultado = extrairItensPayloadColecaoContrariusScrivener('lugares', [
        { id_lugar: 'lg-1', titulo: 'Cidade X' },
      ]);
      expect(resultado.itens[0].tipo).toBe('lugar');
      expect(resultado.itens[0].id).toBe('lg-1');
    });

    it('extrai relacoes mapeando tipo para relacao', () => {
      const resultado = extrairItensPayloadColecaoContrariusScrivener('relacoes', [
        { id: 'rel-1', nome: 'Relação Y' },
      ]);
      expect(resultado.itens[0].tipo).toBe('relacao');
    });

    it('extrai grupos, objetos e notas com tipos corretos', () => {
      const grupos = extrairItensPayloadColecaoContrariusScrivener('grupos', [{ id: 'g1', titulo: 'G' }]);
      const objetos = extrairItensPayloadColecaoContrariusScrivener('objetos', [{ id: 'o1', titulo: 'O' }]);
      const notas = extrairItensPayloadColecaoContrariusScrivener('notas', [{ id: 'n1', titulo: 'N' }]);
      expect(grupos.itens[0].tipo).toBe('grupo');
      expect(objetos.itens[0].tipo).toBe('objeto');
      expect(notas.itens[0].tipo).toBe('nota');
    });

    it('usa id com prioridade: id > codigo > consc_id > id_evento > id_lugar > file.path > path', () => {
      const porId = extrairItensPayloadColecaoContrariusScrivener('consciencias', [
        { id: 'id-prim', codigo: 'cod', consc_id: 'consc', titulo: 'T' },
      ]);
      expect(porId.itens[0].id).toBe('id-prim');

      const porCodigo = extrairItensPayloadColecaoContrariusScrivener('consciencias', [
        { codigo: 'cod-1', consc_id: 'consc', titulo: 'T' },
      ]);
      expect(porCodigo.itens[0].id).toBe('cod-1');

      const porConscId = extrairItensPayloadColecaoContrariusScrivener('consciencias', [
        { consc_id: 'consc-1', titulo: 'T' },
      ]);
      expect(porConscId.itens[0].id).toBe('consc-1');
    });

    it('extrai id e titulo de file.path e file.basename', () => {
      const resultado = extrairItensPayloadColecaoContrariusScrivener('lugares', [
        { file: { path: 'vault/Cidade.md', basename: 'Cidade' } },
      ]);
      expect(resultado.itens[0].id).toBe('vault/Cidade.md');
      expect(resultado.itens[0].titulo).toBe('Cidade');
      expect(resultado.itens[0].caminhoFonte).toBe('vault/Cidade.md');
    });

    it('usa path raiz quando file ausente', () => {
      const resultado = extrairItensPayloadColecaoContrariusScrivener('notas', [
        { path: 'notas/nota-1.md', basename: 'nota-1' },
      ]);
      expect(resultado.itens[0].id).toBe('notas/nota-1.md');
      expect(resultado.itens[0].titulo).toBe('nota-1');
    });

    it('usa titulo com prioridade: titulo > nome > nome_atual > file.basename > basename > id', () => {
      const porTitulo = extrairItensPayloadColecaoContrariusScrivener('eventos', [
        { id: 'x', titulo: 'Titulo', nome: 'Nome' },
      ]);
      expect(porTitulo.itens[0].titulo).toBe('Titulo');

      const porNome = extrairItensPayloadColecaoContrariusScrivener('eventos', [
        { id: 'x', nome: 'Nome', nome_atual: 'NomeAtual' },
      ]);
      expect(porNome.itens[0].titulo).toBe('Nome');

      const porNomeAtual = extrairItensPayloadColecaoContrariusScrivener('consciencias', [
        { id: 'x', nome_atual: 'Nome Atual' },
      ]);
      expect(porNomeAtual.itens[0].titulo).toBe('Nome Atual');

      const porId = extrairItensPayloadColecaoContrariusScrivener('notas', [
        { id: 'fallback-id' },
      ]);
      expect(porId.itens[0].titulo).toBe('fallback-id');
    });

    it('converte string numérica para number em ordemNarrativa', () => {
      const resultado = extrairItensPayloadColecaoContrariusScrivener('eventos', [
        { id: 'e1', titulo: 'Ev', ordemNarrativa: '5' },
      ]);
      expect(resultado.itens[0].ordemNarrativa).toBe(5);
      expect(typeof resultado.itens[0].ordemNarrativa).toBe('number');
    });

    it('converte string numérica para number em ordemCronologica', () => {
      const resultado = extrairItensPayloadColecaoContrariusScrivener('eventos', [
        { id: 'e1', titulo: 'Ev', ordemCronologica: '1500' },
      ]);
      expect(resultado.itens[0].ordemCronologica).toBe(1500);
    });

    it('usa ordem_narrativa como fallback para ordemNarrativa', () => {
      const resultado = extrairItensPayloadColecaoContrariusScrivener('eventos', [
        { id: 'e1', titulo: 'Ev', ordem_narrativa: 3 },
      ]);
      expect(resultado.itens[0].ordemNarrativa).toBe(3);
    });

    it('usa ano_ordem como fallback para ordemCronologica', () => {
      const resultado = extrairItensPayloadColecaoContrariusScrivener('consciencias', [
        { id: 'c1', titulo: 'C', ano_ordem: 1800 },
      ]);
      expect(resultado.itens[0].ordemCronologica).toBe(1800);
    });

    it('usa nascimento como fallback para ordemCronologica', () => {
      const resultado = extrairItensPayloadColecaoContrariusScrivener('consciencias', [
        { id: 'c1', titulo: 'C', nascimento: '1850' },
      ]);
      expect(resultado.itens[0].ordemCronologica).toBe(1850);
    });

    it('combina tags de tags, holopensenes, nucleo_geo e mov_historico sem duplicatas', () => {
      const resultado = extrairItensPayloadColecaoContrariusScrivener('lugares', [
        {
          id: 'l1',
          titulo: 'L',
          tags: ['alpha', 'beta'],
          holopensenes: ['beta', 'gamma'],
          nucleo_geo: 'delta',
          mov_historico: ['alpha', 'epsilon'],
        },
      ]);
      const tags = resultado.itens[0].tags ?? [];
      expect(tags).toContain('alpha');
      expect(tags).toContain('beta');
      expect(tags).toContain('gamma');
      expect(tags).toContain('delta');
      expect(tags).toContain('epsilon');
      expect(new Set(tags).size).toBe(tags.length);
    });

    it('usa primeiro item string válido quando livro é array', () => {
      const resultado = extrairItensPayloadColecaoContrariusScrivener('eventos', [
        { id: 'e1', titulo: 'Ev', livros: ['Livro A', 'Livro B'] },
      ]);
      expect(resultado.itens[0].livro).toBe('Livro A');
    });

    it('usa livro direto quando é string', () => {
      const resultado = extrairItensPayloadColecaoContrariusScrivener('eventos', [
        { id: 'e1', titulo: 'Ev', livro: 'Livro Único' },
      ]);
      expect(resultado.itens[0].livro).toBe('Livro Único');
    });

    it('usa metadata.livro como fallback', () => {
      const resultado = extrairItensPayloadColecaoContrariusScrivener('notas', [
        { id: 'n1', titulo: 'N', metadata: { livro: 'Livro Meta' } },
      ]);
      expect(resultado.itens[0].livro).toBe('Livro Meta');
    });

    it('usa primeiro período válido quando periodo é array', () => {
      const resultado = extrairItensPayloadColecaoContrariusScrivener('eventos', [
        { id: 'e1', titulo: 'Ev', periodo: ['Era 1', 'Era 2'] },
      ]);
      expect(resultado.itens[0].periodo).toBe('Era 1');
    });

    it('usa metadata.periodo como fallback', () => {
      const resultado = extrairItensPayloadColecaoContrariusScrivener('notas', [
        { id: 'n1', titulo: 'N', metadata: { periodo: 'Séc. XVIII' } },
      ]);
      expect(resultado.itens[0].periodo).toBe('Séc. XVIII');
    });

    it('inclui origemColecao na metadata do item', () => {
      const resultado = extrairItensPayloadColecaoContrariusScrivener('grupos', [
        { id: 'g1', titulo: 'G' },
      ]);
      expect(resultado.itens[0].metadata?.origemColecao).toBe('grupos');
    });

    it('extrai texto de texto, conteudo ou body', () => {
      const porTexto = extrairItensPayloadColecaoContrariusScrivener('notas', [
        { id: 'n1', titulo: 'N', texto: 'Conteúdo do texto' },
      ]);
      expect(porTexto.itens[0].texto).toBe('Conteúdo do texto');

      const porConteudo = extrairItensPayloadColecaoContrariusScrivener('notas', [
        { id: 'n2', titulo: 'N2', conteudo: 'Conteúdo alternativo' },
      ]);
      expect(porConteudo.itens[0].texto).toBe('Conteúdo alternativo');
    });

    it('descarta itens inválidos e registra aviso com tipo e índice', () => {
      const resultado = extrairItensPayloadColecaoContrariusScrivener('eventos', [
        { id: 'valido', titulo: 'Válido' },
        null,
        'string-invalida',
        { titulo: 'Sem id' },
      ]);
      expect(resultado.totalItens).toBe(1);
      expect(resultado.descartados).toBe(3);
      expect(resultado.avisos.length).toBe(3);
      expect(resultado.avisos[0]).toContain('eventos');
      expect(resultado.avisos[0]).toContain('[1]');
    });

    it('item sem id é descartado com aviso', () => {
      const resultado = extrairItensPayloadColecaoContrariusScrivener('lugares', [
        { titulo: 'Sem id de qualquer tipo' },
      ]);
      expect(resultado.totalItens).toBe(0);
      expect(resultado.descartados).toBe(1);
      expect(resultado.avisos[0]).toContain('[lugares]');
    });

    it('ordena resultado usando ordenarItensPayloadScrivener', () => {
      const resultado = extrairItensPayloadColecaoContrariusScrivener('eventos', [
        { id: 'e3', titulo: 'Evento C', ordemNarrativa: 3 },
        { id: 'e1', titulo: 'Evento A', ordemNarrativa: 1 },
        { id: 'e2', titulo: 'Evento B', ordemNarrativa: 2 },
      ]);
      expect(resultado.itens.map(i => i.id)).toEqual(['e1', 'e2', 'e3']);
    });

    it('não depende de fs, path ou obsidian', () => {
      const resultado = extrairItensPayloadColecaoContrariusScrivener('notas', [
        { id: 'n1', titulo: 'Nota pura' },
      ]);
      expect(resultado.totalItens).toBe(1);
    });
  });

  describe('extrairItensPayloadContrariusScrivener', () => {
    it('extrai de múltiplas coleções combinando tudo', () => {
      const resultado = extrairItensPayloadContrariusScrivener({
        consciencias: [{ id: 'c1', titulo: 'Consciência 1' }],
        eventos: [{ id: 'ev1', titulo: 'Evento 1' }],
        lugares: [{ id: 'lg1', titulo: 'Lugar 1' }],
      });
      expect(resultado.totalItens).toBe(3);
      const tipos = resultado.itens.map(i => i.tipo);
      expect(tipos).toContain('consciencia');
      expect(tipos).toContain('evento');
      expect(tipos).toContain('lugar');
    });

    it('ignora coleções ausentes ou vazias', () => {
      const resultado = extrairItensPayloadContrariusScrivener({
        retrovidas: [],
        notas: [{ id: 'n1', titulo: 'Nota' }],
      });
      expect(resultado.totalItens).toBe(1);
      expect(resultado.itens[0].tipo).toBe('nota');
    });

    it('acumula descartados e avisos de todas as coleções', () => {
      const resultado = extrairItensPayloadContrariusScrivener({
        consciencias: [{ titulo: 'Sem id' }],
        eventos: [null, { id: 'ev1', titulo: 'Válido' }],
      });
      expect(resultado.descartados).toBe(2);
      expect(resultado.avisos.length).toBe(2);
      expect(resultado.totalItens).toBe(1);
    });

    it('ordena resultado final com todos os itens combinados', () => {
      const resultado = extrairItensPayloadContrariusScrivener({
        eventos: [
          { id: 'e2', titulo: 'Evento 2', ordemNarrativa: 2 },
          { id: 'e3', titulo: 'Evento 3', ordemNarrativa: 3 },
        ],
        consciencias: [
          { id: 'c1', titulo: 'Consciência 1', ordemNarrativa: 1 },
        ],
      });
      expect(resultado.itens.map(i => i.id)).toEqual(['c1', 'e2', 'e3']);
    });

    it('retorna resultado vazio quando fonte vazia', () => {
      const resultado = extrairItensPayloadContrariusScrivener({});
      expect(resultado.totalItens).toBe(0);
      expect(resultado.descartados).toBe(0);
      expect(resultado.avisos).toEqual([]);
      expect(resultado.itens).toEqual([]);
    });
  });
});
