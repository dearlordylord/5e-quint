/**
 * Removes Markdown emphasis that is presentation-only in local SRD Stat Block
 * spans. Intra-token underscores remain evidence so normalization cannot hide
 * a substantive identifier or prose difference.
 */
export function stripSrdStatBlockMarkdownEmphasis(value: string): string {
  return value.replace(/\*+/g, "").replace(/(?<!\w)_+|_+(?!\w)/g, "");
}
