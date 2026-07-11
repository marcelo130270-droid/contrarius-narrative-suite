import type { ManifestoScrivener } from './scrivener-package-manifest';
import { validarManifestoScrivener } from './scrivener-package-manifest';
import type { ContextoManifestoScrivenerOperacional } from './scrivener-package-manifest-factory';
import { criarEntradaManifestoOperacionalScrivener } from './scrivener-package-manifest-factory';
import type { PlanoPacoteScrivener } from './scrivener-package-plan-model';
import { criarPlanoPacoteScrivener } from './scrivener-package-plan-model';
import type { ItemPayloadScrivener } from './scrivener-package-payload-model';
import { criarPayloadScrivener } from './scrivener-package-payload-model';

export interface ResultadoPlanoPacoteScrivenerOperacional {
    manifesto: ManifestoScrivener;
    plano: PlanoPacoteScrivener;
}

export interface ContextoPlanoPacoteScrivenerOperacional extends ContextoManifestoScrivenerOperacional {
    itensPayload?: Partial<ItemPayloadScrivener>[];
}

export function criarPlanoPacoteOperacionalScrivener(
    contexto: ContextoPlanoPacoteScrivenerOperacional,
): ResultadoPlanoPacoteScrivenerOperacional {
    const entrada = criarEntradaManifestoOperacionalScrivener(contexto);
    const manifesto = validarManifestoScrivener(entrada);
    const payload = criarPayloadScrivener({
        manifestoId: manifesto.id,
        itens: contexto.itensPayload,
        geradoEm: manifesto.criadoEm,
    });
    const plano = criarPlanoPacoteScrivener(manifesto, { payload });

    return {
        manifesto,
        plano,
    };
}
