export interface CollisionMaskFrame {
  width: number;
  height: number;
  opaque: Uint8Array;
}

export interface CollisionMaskSample {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  flipX: boolean;
  flipY: boolean;
  mask: CollisionMaskFrame;
}
