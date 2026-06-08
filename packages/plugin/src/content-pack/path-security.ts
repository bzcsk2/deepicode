import { resolve, relative, isAbsolute } from "node:path"
import { realpathSync } from "node:fs"
import type { ContentPackDiagnostic } from "./types.js"

export interface PathValidationResult {
  isValid: boolean
  resolvedPath: string
  diagnostic?: ContentPackDiagnostic
}

/**
 * Validates a candidate path is truly within the root directory.
 * Replaces vulnerable startsWith() checks with proper resolve/relative/isAbsolute.
 * Handles: ../ traversal, root prefix deception, symlink escape.
 */
export function validateAssetPath(
  candidate: string,
  rootDir: string,
  assetKind: string,
  assetId: string,
  pluginId: string,
): PathValidationResult {
  const resolvedRoot = resolve(rootDir)
  const resolved = resolve(candidate)
  const rel = relative(resolvedRoot, resolved)

  // Check for traversal: relative path must not start with ".."
  // Also check isAbsolute on the relative result (happens on Windows with different drives)
  if (rel.startsWith("..") || isAbsolute(rel)) {
    return {
      isValid: false,
      resolvedPath: resolved,
      diagnostic: {
        type: "error",
        pluginId,
        message: `Path traversal blocked: ${assetKind} "${assetId}" attempts to escape root directory`,
        detail: `Relative path: ${rel}`,
      },
    }
  }

  // Check symlink doesn't escape root
  try {
    const real = realpathSync(resolved)
    const realRel = relative(resolvedRoot, real)
    if (realRel.startsWith("..") || isAbsolute(realRel)) {
      return {
        isValid: false,
        resolvedPath: resolved,
        diagnostic: {
          type: "error",
          pluginId,
          message: `Symlink escape blocked: ${assetKind} "${assetId}" links outside root directory`,
          detail: `Real path: ${real}`,
        },
      }
    }
  } catch {
    // realpathSync fails if file doesn't exist yet — accept the path resolution
  }

  return { isValid: true, resolvedPath: resolved }
}
