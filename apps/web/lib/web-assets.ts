import manifest from "./web-assets.json";

export type WebAsset = {
  src: string;
  width: number;
  height: number;
  bytes: number;
};
export const webAssets: Record<string, WebAsset> = manifest;
export function webImage(source: string): string {
  return webAssets[source].src;
}
