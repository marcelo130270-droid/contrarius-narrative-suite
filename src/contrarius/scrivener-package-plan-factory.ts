import type { ManifestoScrivener } from './scrivener-package-manifest';
import { validarManifestoScrivener } from './scrivener-package-manifest';
import type { ContextoManifestoScrivenerOperacional } from './scrivener-package-manifest-factory';
import { criarEntradaManifestoOperacionalScrivener } from './scrivener-package-manifest-factory';
import type { PlanoPacoteScrivener } from './scrivener-package-plan-model';
import { criarPlanoPacoteScrivener } from './scrivener-package-plan-model';

export interface ResultadoPlanoPacoteScrivenerOperacional {
    manifesto: ManifestoScrivener;
    plano: PlanoPacoteScrivener;
}

export function criarPlanoPacoteOperacionalScrivener(
    contexto: ContextoManifestoScrivenerOperacional,
): ResultadoPlanoPacoteScrivenerOperacional {
    const entrada = criarEntradaManifestoOperacionalScrivener(contexto);
    const manifesto = validarManifestoScrivener(entrada);
    const plano = criarPlanoPacoteScrivener(manifesto);

    return {
        manifesto,
        plano,
    };
}
