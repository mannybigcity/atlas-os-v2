export function atlasStaffCanSend(input: {
  organizationId?: string | null;
  pending?: boolean;
  capped?: boolean;
  previewMode?: boolean;
}) {
  void input.previewMode;
  return Boolean(input.organizationId) && !input.pending && !input.capped;
}
