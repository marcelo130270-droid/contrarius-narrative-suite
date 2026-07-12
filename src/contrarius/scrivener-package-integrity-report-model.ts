import type { PlanoPacoteScrivener } from './scrivener-package-plan-model';
import type { ResultadoIntegridadePacoteScrivener } from './scrivener-package-integrity-model';
import { validarIntegridadePlanoPacoteScrivener } from './scrivener-package-integrity-model';

export const SCHEMA_RELATORIO_INTEGRIDADE_PACOTE_SCRIVENER = 'contrarius-scrivener-package-integrity/v1' as const;

export interface RelatorioIntegridadePacoteScrivener {
    schema: typeof SCHEMA_RELATORIO_INTEGRIDADE_PACOTE_SCRIVENER;
    geradoEm: string;
    manifestoId?: string;
    caminhoPacote?: string;
    resultado: ResultadoIntegridadePacoteScrivener;
}

export interface ArquivoRelatorioIntegridadePacoteScrivener {
    caminhoRelativo: 'integrity/report.json';
    tipo: 'integrity-report';
    conteudo: string;
    tamanhoCaracteres: number;
}

export function criarRelatorioIntegridadePacoteScrivener(
    plano: PlanoPacoteScrivener,
    geradoEm?: string,
): RelatorioIntegridadePacoteScrivener {
    const resultado = validarIntegridadePlanoPacoteScrivener(plano);
    const dataGerado = geradoEm ?? new Date().toISOString();

    const relatorio: RelatorioIntegridadePacoteScrivener = {
        schema: SCHEMA_RELATORIO_INTEGRIDADE_PACOTE_SCRIVENER,
        geradoEm: dataGerado,
        resultado,
    };

    const manifestoArquivo = plano.arquivos.find(a => a.caminhoRelativo === 'manifest.json');
    if (manifestoArquivo) {
        try {
            const parsed = JSON.parse(manifestoArquivo.conteudo) as Record<string, unknown>;
            if (typeof parsed.id === 'string') relatorio.manifestoId = parsed.id;
            if (typeof parsed.caminhoPacote === 'string') relatorio.caminhoPacote = parsed.caminhoPacote;
        } catch {
            // manifest.json inválido; manifestoId/caminhoPacote omitidos; erro já registrado em resultado
        }
    }

    return relatorio;
}

export function criarArquivoRelatorioIntegridadePacoteScrivener(
    plano: PlanoPacoteScrivener,
    geradoEm?: string,
): ArquivoRelatorioIntegridadePacoteScrivener {
    const relatorio = criarRelatorioIntegridadePacoteScrivener(plano, geradoEm);
    const conteudo = JSON.stringify(relatorio, null, 2);
    return {
        caminhoRelativo: 'integrity/report.json',
        tipo: 'integrity-report',
        conteudo,
        tamanhoCaracteres: conteudo.length,
    };
}
