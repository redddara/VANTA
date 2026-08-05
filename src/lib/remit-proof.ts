/** Shared limits for remit screenshot / image proof uploads. */

export const REMIT_PROOF_BUCKET = "remit-proofs";

export const REMIT_PROOF_MAX_BYTES = 5 * 1024 * 1024;

export const REMIT_PROOF_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type RemitProofMime = (typeof REMIT_PROOF_MIME)[number];

const EXT_BY_MIME: Record<RemitProofMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function isRemitProofMime(value: string): value is RemitProofMime {
  return (REMIT_PROOF_MIME as readonly string[]).includes(value);
}

export function remitProofExtension(mime: RemitProofMime): string {
  return EXT_BY_MIME[mime];
}

export function validateRemitProofFile(file: File): string | null {
  if (!isRemitProofMime(file.type)) {
    return "Use a PNG, JPG, WebP, or GIF screenshot.";
  }
  if (file.size > REMIT_PROOF_MAX_BYTES) {
    return "Keep proof images under 5 MB.";
  }
  return null;
}
