declare module "qrcode" {
  export function toDataURL(text: string, options?: unknown): Promise<string>;
}
