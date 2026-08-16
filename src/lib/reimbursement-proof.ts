/** Screenshot proof uploads for reimbursement logs. */

export const REIMBURSEMENT_PROOF_BUCKET = "reimbursement-proofs";

export {
  REMIT_PROOF_MAX_BYTES as REIMBURSEMENT_PROOF_MAX_BYTES,
  REMIT_PROOF_MIME as REIMBURSEMENT_PROOF_MIME,
  isRemitProofMime as isReimbursementProofMime,
  remitProofExtension as reimbursementProofExtension,
  validateRemitProofFile as validateReimbursementProofFile,
  type RemitProofMime as ReimbursementProofMime,
} from "@/lib/remit-proof";
