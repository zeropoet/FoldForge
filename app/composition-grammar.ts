import luminanceField from "../grammar/composition-001-luminance.json";
import lexicalField from "../grammar/composition-002-lexical.json";
import resonantHoldings from "../grammar/composition-003-resonance.json";
import visualRelations from "../grammar/composition-004-visual-relations.json";
import chromaticField from "../grammar/composition-005-chromatic.json";

export const compositionGrammar = {
  id: luminanceField.id,
  version: luminanceField.version,
  title: luminanceField.presentation.title,
  interfaceStatement: luminanceField.presentation.interfaceStatement,
  direction: luminanceField.transformations[3].output,
} as const;

function interfaceGrammar(manifest: {
  id: string;
  version: string;
  presentation: { title: string; interfaceStatement: string };
}) {
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
  visual: interfaceGrammar(visualRelations),
  chromatic: interfaceGrammar(chromaticField),
} as const;
