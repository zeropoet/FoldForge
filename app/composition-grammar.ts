import luminanceField from "../grammar/composition-001-luminance.json";
import lexicalField from "../grammar/composition-002-lexical.json";
import resonantHoldings from "../grammar/composition-003-resonance.json";

export const compositionGrammar = {
  id: luminanceField.id,
  version: luminanceField.version,
  title: luminanceField.presentation.title,
  interfaceStatement: luminanceField.presentation.interfaceStatement,
  direction: luminanceField.transformations[3].output,
} as const;

function interfaceGrammar(manifest: typeof lexicalField | typeof resonantHoldings) {
  return {
    id: manifest.id,
    version: manifest.version,
    title: manifest.presentation.title,
    interfaceStatement: manifest.presentation.interfaceStatement,
  } as const;
}

export const composerGrammars = {
  language: interfaceGrammar(lexicalField),
  sound: interfaceGrammar(resonantHoldings),
} as const;
