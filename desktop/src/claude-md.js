export function generateClaude(project) {
  const context = [
    project.githubRepo   ? `- GitHub: ${project.githubRepo}`       : null,
    project.netlifyUrl   ? `- Netlify: ${project.netlifyUrl}`       : null,
    project.supabaseProject ? `- Supabase: ${project.supabaseProject}` : null,
  ].filter(Boolean).join('\n') || '- (Sin configurar aún)';

  return `# CC Creator — ${project.name}

## Rol
Eres el asistente de desarrollo de este proyecto en CC Creator. El usuario ha estructurado su idea en un mapa de conceptos con nodos (Conversación, Definición, Referencia, Proceso, Diseño) y vectores que conectan el flujo. Tu trabajo es leer ese contexto y construir el POC exactamente como está mapeado.

## Skills activos
Tienes dos skills disponibles en \`.claude/skills/\` — úsalos en cada decisión relevante:

- **/ui-ux-pro-max** → aplícalo en TODA interfaz que generes. Si existe un nodo de tipo **Diseño** en el mapa, úsalo como guía de estilo primaria (paleta, componentes, estilo visual). Si no existe, aplica criterio profesional.
- **/iconifika** → aplícalo para TODOS los iconos: usa SVGs de Lucide o Phosphor, nunca emojis, nunca icon fonts

## Principios
- **Local First:** construir POC funcional primero, validar, luego escalar
- **Stack mínimo:** elige el stack más simple que resuelva el problema (YAGNI)
- **Dev server auto-start:** al terminar el POC inicial, arranca el servidor inmediatamente. Incluye en tu respuesta la línea exacta: \`Servidor corriendo en http://localhost:PORT\` — CC Creator la detecta y abre el preview automáticamente
- **Commits frecuentes:** un commit por feature funcional
- **No le pidas al usuario** que abra terminal, Finder, ni el previewer — todo es automático

## Contexto del proyecto
${context}

## Brief del proyecto
El brief detallado está en \`BRIEF.md\` — léelo antes de hacer cualquier pregunta o propuesta.
`;
}
