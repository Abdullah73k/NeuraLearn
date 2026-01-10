/**
 * 
 * Relation: \
 * Parent → Child (refines)
 * 
 * Meaning: \
 * 
 * The child node is a more specific subtopic of the parent node. \
 * The parent provides constraints, goals, and direction. \
 * The child remains within scope of the parent. \
 * 
 * AI assistent should: \
 * 
 * Reuse the parent’s high-level goal or topic. \
 * Stay strictly inside the child’s scope \
 * Warn when the user drifts off-scope \
 * Expand the parent’s idea in a more detailed and focused direction \
 * Help the user break broad goals into structured subproblems \
 * 
 */

export const refinesPrompt = ``;