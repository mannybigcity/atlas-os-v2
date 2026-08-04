import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export type ObsidianNote = {
  path: string;
  title: string;
  folder: string;
  updatedAt: string;
  size: number;
};

export type ObsidianVaultSnapshot = {
  configured: boolean;
  vaultPath: string | null;
  exists: boolean;
  noteCount: number;
  folderCount: number;
  updatedAt: string | null;
  notes: ObsidianNote[];
  error: string | null;
};

const ignoredDirectories = new Set([".obsidian", ".git", ".trash", "node_modules"]);

export async function getObsidianVaultSnapshot(): Promise<ObsidianVaultSnapshot> {
  const configuredPath = process.env.ATLAS_OBSIDIAN_VAULT_PATH?.trim();

  if (!configuredPath) {
    return emptySnapshot(null, "ATLAS_OBSIDIAN_VAULT_PATH is not configured.");
  }

  const vaultPath = path.resolve(configuredPath);

  try {
    const vaultStats = await stat(vaultPath);
    if (!vaultStats.isDirectory()) {
      return emptySnapshot(vaultPath, "The configured path is not a folder.");
    }

    const notes: ObsidianNote[] = [];
    const folders = new Set<string>();
    await scanDirectory(vaultPath, vaultPath, notes, folders);
    notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return {
      configured: true,
      vaultPath,
      exists: true,
      noteCount: notes.length,
      folderCount: folders.size,
      updatedAt: notes[0]?.updatedAt ?? null,
      // Keep the metadata index available to the server-side discovery layer.
      // The UI limits how many notes it renders; note content is never returned.
      notes,
      error: null,
    };
  } catch (error) {
    return emptySnapshot(
      vaultPath,
      error instanceof Error ? error.message : "The vault could not be read.",
    );
  }
}

async function scanDirectory(
  vaultPath: string,
  directoryPath: string,
  notes: ObsidianNote[],
  folders: Set<string>,
) {
  const entries = await readdir(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".") {
      continue;
    }

    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) {
        continue;
      }

      const relativeFolder = path.relative(vaultPath, entryPath);
      folders.add(relativeFolder);
      await scanDirectory(vaultPath, entryPath, notes, folders);
      continue;
    }

    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".md") {
      continue;
    }

    const fileStats = await stat(entryPath);
    const relativePath = path
      .relative(vaultPath, entryPath)
      .split(path.sep)
      .join("/");
    const relativeFolder = path.dirname(relativePath);
    notes.push({
      path: relativePath,
      title: path.basename(entry.name, ".md"),
      folder: relativeFolder === "." ? "Root" : relativeFolder,
      updatedAt: fileStats.mtime.toISOString(),
      size: fileStats.size,
    });
  }
}

function emptySnapshot(
  vaultPath: string | null,
  error: string,
): ObsidianVaultSnapshot {
  return {
    configured: Boolean(vaultPath),
    vaultPath,
    exists: false,
    noteCount: 0,
    folderCount: 0,
    updatedAt: null,
    notes: [],
    error,
  };
}
