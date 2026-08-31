export const ATLAS_STAFF_PROMPT_LIMIT = 1200;
export const ATLAS_STAFF_TEXT_EXCERPT_LIMIT = 700;

function isReadableTextFile(file: File) {
  return (
    file.type.startsWith("text/") ||
    /\.(txt|md|csv|json|log)$/i.test(file.name)
  );
}

export async function composeAtlasStaffPrompt(message: string, file: File | null) {
  const parts = [message.trim()].filter(Boolean);

  if (file) {
    parts.push(
      `Attached: ${file.name} (${file.type || "file"}, ${Math.max(1, Math.round(file.size / 1024))} KB)`,
    );

    if (isReadableTextFile(file) && file.size <= 400_000) {
      const excerpt = (await file.text()).trim().slice(0, ATLAS_STAFF_TEXT_EXCERPT_LIMIT);
      if (excerpt) parts.push(excerpt);
    }
  }

  return parts.join("\n\n").slice(0, ATLAS_STAFF_PROMPT_LIMIT);
}
